import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { publishSyncEvent } from '@/lib/mqttPublisher';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const isClient = currentUser.role === 'CLIENT';

    const schedules = await prisma.schedule.findMany({
      where: isClient ? { screen: { userId: currentUser.id } } : undefined,
      orderBy: { startDate: 'desc' },
      include: {
        screen: true,
        game: true,
        video: true,
      },
    });
    return NextResponse.json(schedules);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching schedules' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { screenId, gameId, videoId, startDate, endDate, isActive } = body;

    const screen = await prisma.screen.findUnique({
      where: { id: screenId },
    });

    if (!screen) {
      return NextResponse.json({ error: 'Pantalla no encontrada' }, { status: 404 });
    }

    // Si es CLIENT, verificar que la pantalla le pertenezca
    if (currentUser.role === 'CLIENT' && screen.userId !== currentUser.id) {
      return NextResponse.json(
        { error: 'Acceso denegado a esta pantalla' },
        { status: 403 }
      );
    }

    // Si programa un juego, verificar que su plan lo permita
    if (currentUser.role === 'CLIENT' && gameId) {
      const allowedGameIds = currentUser.plan?.games?.map(g => g.id) || [];
      if (!allowedGameIds.includes(gameId)) {
        return NextResponse.json(
          {
            error:
              'Este juego no está disponible en tu plan actual. Contacta al administrador para subir de plan.',
          },
          { status: 403 }
        );
      }
    }

    const schedule = await prisma.schedule.create({
      data: { 
        screenId, 
        gameId: gameId || null, 
        videoId: videoId || null, 
        startDate: new Date(startDate), 
        endDate: endDate ? new Date(endDate) : null,
        isActive: isActive !== undefined ? isActive : true
      },
      include: {
        game: true,
        video: true,
        screen: true
      }
    });

    // Notificar a la pantalla por MQTT
    await publishSyncEvent(screenId);

    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error creating schedule' }, { status: 500 });
  }
}
