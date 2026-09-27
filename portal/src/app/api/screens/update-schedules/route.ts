import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { processDueUpdateSchedules } from '@/lib/updateScheduler';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Procesar cualquier actualización pendiente cuya fecha/hora ya haya llegado
    await processDueUpdateSchedules();

    const isClient = currentUser.role === 'CLIENT';

    const schedules = await prisma.updateSchedule.findMany({
      where: isClient ? { userId: currentUser.id } : undefined,
      orderBy: { scheduledAt: 'desc' },
      take: 50,
      include: {
        screen: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    return NextResponse.json(schedules);
  } catch (error) {
    console.error('Error fetching update schedules:', error);
    return NextResponse.json({ error: 'Error obteniendo programaciones' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { targetType, screenId, scheduledAt, targetName, userId } = body;

    if (!scheduledAt) {
      return NextResponse.json({ error: 'Fecha y hora requerida' }, { status: 400 });
    }

    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 });
    }

    if (scheduledDate.getTime() < Date.now() - 30000) {
      return NextResponse.json(
        { error: 'La fecha programada debe ser en el futuro.' },
        { status: 400 }
      );
    }

    // 1. Validaciones por Tipo de Destino
    if (targetType === 'SYSTEM_ALL') {
      if (currentUser.role !== 'SUPER_ADMIN') {
        return NextResponse.json(
          { error: 'Acceso denegado. Solo el Super Admin puede programar toda la flota.' },
          { status: 403 }
        );
      }

      const schedule = await prisma.updateSchedule.create({
        data: {
          targetType: 'SYSTEM_ALL',
          targetName: 'Toda la plataforma (Flota completa)',
          scheduledAt: scheduledDate,
          userId: currentUser.id,
        },
      });

      return NextResponse.json(schedule, { status: 201 });
    }

    if (targetType === 'CLIENT_ALL') {
      const targetUserId = currentUser.role === 'SUPER_ADMIN' ? (userId || currentUser.id) : currentUser.id;

      const userTarget = await prisma.user.findUnique({
        where: { id: targetUserId },
        include: { _count: { select: { screens: true } } },
      });

      if (!userTarget) {
        return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
      }

      const schedule = await prisma.updateSchedule.create({
        data: {
          targetType: 'CLIENT_ALL',
          targetName: `Todas las pantallas de ${userTarget.name} (${userTarget._count.screens} pantallas)`,
          scheduledAt: scheduledDate,
          userId: targetUserId,
        },
      });

      return NextResponse.json(schedule, { status: 201 });
    }

    if (targetType === 'SINGLE' || screenId) {
      if (!screenId) {
        return NextResponse.json({ error: 'ID de pantalla requerido' }, { status: 400 });
      }

      const screen = await prisma.screen.findUnique({ where: { id: screenId } });
      if (!screen) {
        return NextResponse.json({ error: 'Pantalla no encontrada' }, { status: 404 });
      }

      if (currentUser.role === 'CLIENT' && screen.userId !== currentUser.id) {
        return NextResponse.json({ error: 'Acceso denegado a esta pantalla' }, { status: 403 });
      }

      const schedule = await prisma.updateSchedule.create({
        data: {
          targetType: 'SINGLE',
          targetName: targetName || screen.name,
          screenId: screen.id,
          scheduledAt: scheduledDate,
          userId: screen.userId || currentUser.id,
        },
      });

      return NextResponse.json(schedule, { status: 201 });
    }

    return NextResponse.json({ error: 'Tipo de destino inválido' }, { status: 400 });
  } catch (error) {
    console.error('Error creating update schedule:', error);
    return NextResponse.json({ error: 'Error al programar actualización' }, { status: 500 });
  }
}
