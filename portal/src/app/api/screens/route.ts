import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
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
      whereClause = { userId: currentUser.id };
    } else if (userIdFilter) {
      if (userIdFilter === 'UNASSIGNED') {
        whereClause = { userId: null };
      } else if (userIdFilter !== 'ALL') {
        whereClause = { userId: userIdFilter };
      }
    }

    const screens = await prisma.screen.findMany({
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
          include: {
            game: true,
            video: true,
          },
        },
      },
    });

    return NextResponse.json(screens);
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Error fetching screens', details }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Los administradores de clientes NO pueden crear pantallas
    if (currentUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Acceso denegado. Solo el Super Administrador puede crear nuevas pantallas.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, location, description, userId } = body;

    const screen = await prisma.screen.create({
      data: {
        name,
        location,
        description,
        userId: userId && userId !== 'none' ? userId : null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    return NextResponse.json(screen, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error creating screen' }, { status: 500 });
  }
}
