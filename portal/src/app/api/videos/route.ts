import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import { publishSyncEvent } from '@/lib/mqttPublisher';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userIdFilter = searchParams.get('userId');

    const isClient = currentUser.role === 'CLIENT';

    let whereClause: any = undefined;
    if (isClient) {
      whereClause = {
        OR: [
          { userId: currentUser.id },
          {
            schedules: {
              some: {
                screen: {
                  userId: currentUser.id,
                },
              },
            },
          },
        ],
      };
    } else if (userIdFilter) {
      if (userIdFilter === 'UNASSIGNED') {
        whereClause = { userId: null };
      } else if (userIdFilter !== 'ALL') {
        whereClause = { userId: userIdFilter };
      }
    }

    const videos = await prisma.video.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            plan: {
              select: {
                id: true,
                name: true,
                maxVideosPerScreen: true,
              },
            },
          },
        },
        schedules: {
          include: { screen: true },
        },
      },
    });
    return NextResponse.json(videos);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching videos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const screenId = formData.get('screenId') as string;
    const clientId = formData.get('clientId') as string;

    if (!file || !title || !screenId) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    let ownerUserId: string | null = null;
    let targetScreen = null;

    if (screenId !== 'none' && screenId !== 'pool') {
      targetScreen = await prisma.screen.findUnique({
        where: { id: screenId },
        include: {
          user: {
            include: { plan: true },
          },
        },
      });

      if (!targetScreen) {
        return NextResponse.json({ error: 'Pantalla no encontrada' }, { status: 404 });
      }
    }

    // Si es CLIENT, verificar pertenencia y límites de plan
    if (currentUser.role === 'CLIENT') {
      ownerUserId = currentUser.id;

      if (targetScreen) {
        if (targetScreen.userId !== currentUser.id) {
          return NextResponse.json({ error: 'Acceso denegado a esta pantalla' }, { status: 403 });
        }

        const maxVideos = currentUser.plan?.maxVideosPerScreen ?? 5;
        const currentCount = await prisma.schedule.count({
          where: {
            screenId: targetScreen.id,
            videoId: { not: null },
            isActive: true,
          },
        });

        if (currentCount >= maxVideos) {
          return NextResponse.json(
            {
              error: `Has alcanzado el límite de ${maxVideos} videos para esta pantalla según tu plan (${currentUser.plan?.name || 'Básico'}).`,
            },
            { status: 403 }
          );
        }
      }
    } else {
      // SUPER_ADMIN
      if (clientId && clientId !== 'none') {
        ownerUserId = clientId;
      } else if (targetScreen?.userId) {
        ownerUserId = targetScreen.userId;
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    
    // Carpeta de pool
    const poolDir = path.join(process.env.VIDEOS_DIR || '/srv/videos', 'pool');
    if (!fs.existsSync(poolDir)) {
      fs.mkdirSync(poolDir, { recursive: true });
    }

    const filepath = path.join(poolDir, filename);
    fs.writeFileSync(filepath, buffer);

    const video = await prisma.video.create({
      data: {
        title: String(title).trim(),
        filename,
        userId: ownerUserId,
      },
    });

    if (targetScreen) {
      await prisma.schedule.create({
        data: {
          screenId: targetScreen.id,
          videoId: video.id,
          startDate: new Date(),
          isActive: true,
        },
      });
      await publishSyncEvent(targetScreen.id);
    }

    return NextResponse.json(video, { status: 201 });
  } catch (error: any) {
    console.error('Error uploading video:', error);
    return NextResponse.json({ error: error.message || 'Error uploading video' }, { status: 500 });
  }
}
