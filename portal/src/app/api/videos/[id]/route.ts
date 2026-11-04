import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import { getCurrentUser } from '@/lib/auth';
import { publishSyncEvent } from '@/lib/mqttPublisher';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const video = await prisma.video.findUnique({
      where: { id },
      include: {
        schedules: {
          select: { screenId: true },
        },
      },
    });

    if (!video) {
      return NextResponse.json({ error: 'Video no encontrado' }, { status: 404 });
    }

    // Segmentación por roles: Un cliente solo puede eliminar sus propios videos
    if (currentUser.role === 'CLIENT' && video.userId && video.userId !== currentUser.id) {
      return NextResponse.json(
        { error: 'Acceso denegado: Este video pertenece a otro cliente.' },
        { status: 403 }
      );
    }

    // Identificar todas las pantallas afectadas donde este video estaba asignado
    const affectedScreenIds = Array.from(new Set(video.schedules.map((s) => s.screenId)));

    // Eliminación segura del archivo físico en disco (sin bloquear si hay permisos restrictivos o si ya fue removido)
    try {
      const baseDirs = [
        process.env.VIDEOS_DIR,
        '/srv/videos',
        '/videos',
      ].filter(Boolean) as string[];

      const cleanFilename = video.filename.replace(/^pool\//, '');
      const candidates = new Set<string>();

      for (const base of baseDirs) {
        candidates.add(path.join(base, 'pool', cleanFilename));
        candidates.add(path.join(base, video.filename));
        candidates.add(path.join(base, path.basename(video.filename)));
      }

      for (const filepath of candidates) {
        if (fs.existsSync(filepath)) {
          try {
            fs.unlinkSync(filepath);
          } catch (unlinkErr) {
            console.warn(`[WARN] No se pudo borrar el archivo físico ${filepath}:`, unlinkErr);
          }
        }
      }
    } catch (fsErr) {
      console.warn('[WARN] Error verificando archivos físicos para video:', fsErr);
    }

    // Eliminar programaciones asociadas y el registro del video en la base de datos de manera atómica
    await prisma.$transaction([
      prisma.schedule.deleteMany({
        where: { videoId: id },
      }),
      prisma.video.delete({
        where: { id },
      }),
    ]);

    // Notificar por MQTT a todas las pantallas afectadas para que sincronicen su playlist de inmediato
    for (const screenId of affectedScreenIds) {
      try {
        await publishSyncEvent(screenId);
      } catch (mqttErr) {
        console.warn(`[WARN] Error enviando sync MQTT a pantalla ${screenId}:`, mqttErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Video eliminado correctamente de la biblioteca y de todas las pantallas.',
      affectedScreensCount: affectedScreenIds.length,
    });
  } catch (error: any) {
    console.error('Error deleting video:', error);
    return NextResponse.json(
      { error: error.message || 'Error al eliminar el video de la base de datos.' },
      { status: 500 }
    );
  }
}
