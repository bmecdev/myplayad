import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { publishUpdateCommand } from '@/lib/mqttPublisher';

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { targetType, screenId, userId } = body;

    // 1. Caso Toda la Plataforma (Broadcast)
    if (targetType === 'SYSTEM_ALL') {
      if (currentUser.role !== 'SUPER_ADMIN') {
        return NextResponse.json(
          { error: 'Acceso denegado. Solo el Super Administrador puede actualizar toda la flota.' },
          { status: 403 }
        );
      }

      await publishUpdateCommand({
        broadcast: true,
        triggeredBy: currentUser.username,
      });

      const totalScreens = await prisma.screen.count();
      return NextResponse.json({
        success: true,
        message: `Orden de actualización broadcast emitida para todas las pantallas del sistema (${totalScreens} pantallas).`,
        count: totalScreens,
      });
    }

    // 2. Caso Todas las Pantallas de un Cliente
    if (targetType === 'CLIENT_ALL') {
      const targetUserId = currentUser.role === 'SUPER_ADMIN' ? (userId || currentUser.id) : currentUser.id;

      const clientScreens = await prisma.screen.findMany({
        where: { userId: targetUserId },
        select: { id: true, name: true },
      });

      if (clientScreens.length === 0) {
        return NextResponse.json(
          { error: 'El cliente no tiene pantallas asignadas actualmente.' },
          { status: 400 }
        );
      }

      for (const s of clientScreens) {
        await publishUpdateCommand({
          screenId: s.id,
          triggeredBy: currentUser.username,
        });
      }

      return NextResponse.json({
        success: true,
        message: `Orden de actualización enviada a ${clientScreens.length} pantalla(s) del cliente.`,
        count: clientScreens.length,
      });
    }

    // 3. Caso Pantalla Individual
    if (targetType === 'SINGLE' || screenId) {
      if (!screenId) {
        return NextResponse.json({ error: 'ID de pantalla requerido' }, { status: 400 });
      }

      const screen = await prisma.screen.findUnique({
        where: { id: screenId },
      });

      if (!screen) {
        return NextResponse.json({ error: 'Pantalla no encontrada' }, { status: 404 });
      }

      // Si es cliente, verificar que le pertenezca
      if (currentUser.role === 'CLIENT' && screen.userId !== currentUser.id) {
        return NextResponse.json(
          { error: 'Acceso denegado. No tienes permisos para actualizar esta pantalla.' },
          { status: 403 }
        );
      }

      await publishUpdateCommand({
        screenId: screen.id,
        triggeredBy: currentUser.username,
      });

      return NextResponse.json({
        success: true,
        message: `Orden de actualización enviada a "${screen.name}".`,
        screenName: screen.name,
      });
    }

    return NextResponse.json({ error: 'Tipo de destino inválido' }, { status: 400 });
  } catch (error) {
    console.error('Error triggering screen update:', error);
    return NextResponse.json({ error: 'Error al enviar orden de actualización' }, { status: 500 });
  }
}
