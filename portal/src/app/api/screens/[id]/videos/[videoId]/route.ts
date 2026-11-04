import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { publishSyncEvent } from '@/lib/mqttPublisher';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; videoId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id: screenId, videoId } = await params;

    const screen = await prisma.screen.findUnique({
      where: { id: screenId },
      select: { id: true, userId: true },
    });

    if (!screen) {
      return NextResponse.json({ error: 'Pantalla no encontrada' }, { status: 404 });
    }

    // Si es CLIENT, solo puede gestionar sus propias pantallas
    if (currentUser.role === 'CLIENT' && screen.userId !== currentUser.id) {
      return NextResponse.json(
        { error: 'Acceso denegado: Esta pantalla no pertenece a tu cuenta.' },
        { status: 403 }
      );
    }

    // Desasignar el video de esta pantalla eliminando su programación
    const result = await prisma.schedule.deleteMany({
      where: {
        screenId,
        videoId,
      },
    });

    // Notificar a la pantalla física para que actualice su rotación por MQTT de inmediato
    await publishSyncEvent(screenId);

    return NextResponse.json({
      success: true,
      message: 'Video desasignado de la pantalla con éxito',
      count: result.count,
    });
  } catch (error: any) {
    console.error('Error desasignando video de pantalla:', error);
    return NextResponse.json(
      { error: error.message || 'Error al desasignar video de la pantalla' },
      { status: 500 }
    );
  }
}
