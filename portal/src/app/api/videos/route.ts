import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import { publishSyncEvent } from '@/lib/mqttPublisher';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const isClient = currentUser.role === 'CLIENT';

    const videos = await prisma.video.findMany({
      where: isClient
        ? {
            schedules: {
              some: {
                screen: {
                  userId: currentUser.id,
                },
              },
            },
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
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

    if (!file || !title || !screenId) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    // Si es CLIENT, verificar que la pantalla seleccionada le pertenezca
    if (currentUser.role === 'CLIENT' && screenId !== 'none') {
      const screen = await prisma.screen.findUnique({
        where: { id: screenId },
      });
      if (!screen || screen.userId !== currentUser.id) {
        return NextResponse.json({ error: 'Acceso denegado a esta pantalla' }, { status: 403 });
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    
    // Carpeta de pool
    const poolDir = path.join('/srv/videos', 'pool');
    if (!fs.existsSync(poolDir)) {
      fs.mkdirSync(poolDir, { recursive: true });
    }

    const filepath = path.join(poolDir, filename);
    fs.writeFileSync(filepath, buffer);

    const video = await prisma.video.create({
      data: {
        title,
        filename,
      },
    });

    if (screenId !== 'none') {
      await prisma.schedule.create({
        data: {
          screenId,
          videoId: video.id,
          startDate: new Date(),
        },
      });
      await publishSyncEvent(screenId);
    }

    return NextResponse.json(video, { status: 201 });
  } catch (error: any) {
    console.error('Error uploading video:', error);
    return NextResponse.json({ error: 'Error uploading video' }, { status: 500 });
  }
}
