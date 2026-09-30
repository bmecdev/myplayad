import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const now = new Date();

    const screen = await prisma.screen.findUnique({
      where: { id },
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
                slug: true,
              },
            },
          },
        },
        schedules: {
          include: {
            video: true,
            game: true,
          },
          orderBy: { startDate: 'desc' },
        },
      },
    });

    if (!screen) {
      return NextResponse.json({ error: 'Pantalla no encontrada' }, { status: 404 });
    }

    // Si es CLIENT, solo puede acceder si la pantalla le fue asignada
    if (currentUser.role === 'CLIENT' && screen.userId !== currentUser.id) {
      return NextResponse.json(
        { error: 'Acceso denegado. No tienes permisos para gestionar esta pantalla.' },
        { status: 403 }
      );
    }

    // Videos asignados a esta pantalla vía programación
    const videos = screen.schedules
      .filter(s => s.videoId && s.video)
      .map(s => s.video)
      .filter((v, i, self) => i === self.findIndex((t) => t?.id === v?.id));

    // Juego activo actual
    const activeGameSchedule = screen.schedules.find(s => 
      s.gameId && 
      s.isActive && 
      (!s.endDate || s.endDate > now) &&
      s.startDate <= now
    );

    // Próximos juegos programados
    const upcomingSchedules = screen.schedules.filter(s =>
      s.gameId &&
      s.isActive &&
      s.startDate > now
    ).sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    return NextResponse.json({
      screen: {
        id: screen.id,
        name: screen.name,
        location: screen.location,
        description: screen.description,
        lastSeen: screen.lastSeen,
        userId: screen.userId,
        user: screen.user,
      },
      videos,
      activeGameSchedule: activeGameSchedule || null,
      upcomingSchedules,
    });
  } catch (error) {
    console.error('Error fetching screen details:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, location, description, userId } = body;

    const existingScreen = await prisma.screen.findUnique({
      where: { id },
    });

    if (!existingScreen) {
      return NextResponse.json({ error: 'Pantalla no encontrada' }, { status: 404 });
    }

    // Verificar permisos
    if (currentUser.role === 'CLIENT' && existingScreen.userId !== currentUser.id) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // Solo el Super Admin puede reasignar el cliente de la pantalla
    const updatedUserId =
      currentUser.role === 'SUPER_ADMIN'
        ? (userId === 'none' || !userId ? null : userId)
        : existingScreen.userId;

    const updated = await prisma.screen.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existingScreen.name,
        location: location !== undefined ? location : existingScreen.location,
        description: description !== undefined ? description : existingScreen.description,
        userId: updatedUserId,
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

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error actualizando pantalla:', error);
    return NextResponse.json({ error: 'Error actualizando pantalla' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Los administradores de clientes NO pueden borrar pantallas
    if (currentUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Acceso denegado. Solo el Super Administrador puede eliminar pantallas.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    await prisma.screen.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error deleting screen' }, { status: 500 });
  }
}
