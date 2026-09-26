import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id: screenId } = await params;
    const body = await request.json();
    const { gameId, startDate, endDate } = body;

    if (!gameId) {
      return NextResponse.json({ error: 'Missing gameId' }, { status: 400 });
    }

    // 1. Verificar existencia de la pantalla
    const screen = await prisma.screen.findUnique({
      where: { id: screenId },
    });

    if (!screen) {
      return NextResponse.json({ error: 'Pantalla no encontrada' }, { status: 404 });
    }

    // 2. Si es CLIENT, validar pertenencia de la pantalla
    if (currentUser.role === 'CLIENT' && screen.userId !== currentUser.id) {
      return NextResponse.json(
        { error: 'Acceso denegado. No tienes permisos para gestionar esta pantalla.' },
        { status: 403 }
      );
    }

    // 3. Si es CLIENT, validar que el juego esté permitido en su plan
    if (currentUser.role === 'CLIENT') {
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

    const now = new Date();
    // Desactivar juegos activos previamente en esta pantalla
    await prisma.schedule.updateMany({
      where: {
        screenId,
        gameId: { not: null },
        isActive: true,
        startDate: { lte: now },
        OR: [
          { endDate: null },
          { endDate: { gt: now } },
        ],
      },
      data: {
        isActive: false,
      },
    });

    // Crear la nueva programación de juego
    const schedule = await prisma.schedule.create({
      data: {
        screenId,
        gameId,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, schedule });
  } catch (error) {
    console.error('Error assigning game:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id: screenId } = await params;

    const screen = await prisma.screen.findUnique({
      where: { id: screenId },
    });

    if (!screen) {
      return NextResponse.json({ error: 'Pantalla no encontrada' }, { status: 404 });
    }

    if (currentUser.role === 'CLIENT' && screen.userId !== currentUser.id) {
      return NextResponse.json(
        { error: 'Acceso denegado. No tienes permisos para gestionar esta pantalla.' },
        { status: 403 }
      );
    }

    const now = new Date();
    await prisma.schedule.updateMany({
      where: {
        screenId,
        gameId: { not: null },
        isActive: true,
        startDate: { lte: now },
        OR: [
          { endDate: null },
          { endDate: { gt: now } },
        ],
      },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing game:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
