import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import { getCurrentUser } from '@/lib/auth';
import { publishSyncEvent } from '@/lib/mqttPublisher';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, userId } = body;

    const existingVideo = await prisma.video.findUnique({
      where: { id },
      include: {
        schedules: {
          select: {
            screenId: true,
            screen: {
              select: { id: true, userId: true, name: true },
            },
          },
        },
      },
    });

    if (!existingVideo) {
      return NextResponse.json({ error: 'Video no encontrado' }, { status: 404 });
    }

    // Segmentación por roles
    if (currentUser.role === 'CLIENT') {
      if (existingVideo.userId !== currentUser.id) {
        return NextResponse.json({ error: 'Acceso denegado a este video' }, { status: 403 });
      }
      if (userId !== undefined && userId !== existingVideo.userId) {
        return NextResponse.json(
          { error: 'No tienes permisos para reasignar el cliente de este video' },
          { status: 403 }
        );
      }
    }

    let updatedUserId = existingVideo.userId;
    const affectedScreens = new Set<string>();

    if (currentUser.role === 'SUPER_ADMIN' && userId !== undefined) {
      updatedUserId = userId === 'none' || !userId ? null : userId;

      if (updatedUserId) {
        const userExists = await prisma.user.findUnique({
          where: { id: updatedUserId },
        });
        if (!userExists) {
          return NextResponse.json({ error: 'El cliente especificado no existe' }, { status: 400 });
        }
      }

      // Si el cliente asignado cambió, desvincular de pantallas que no pertenezcan al nuevo dueño
      if (updatedUserId !== existingVideo.userId) {
        const conflictingSchedules = existingVideo.schedules.filter((s) => {
          if (!updatedUserId) {
            // El video ahora es global: no puede permanecer en pantallas de clientes
            return s.screen?.userId !== null;
          } else {
            // El video ahora pertenece a updatedUserId: no puede permanecer en pantallas de otro cliente
            return s.screen?.userId !== updatedUserId;
          }
        });

        if (conflictingSchedules.length > 0) {
          const screenIdsToRemove = conflictingSchedules.map((s) => s.screenId);
          await prisma.schedule.deleteMany({
            where: {
              videoId: id,
              screenId: { in: screenIdsToRemove },
            },
          });
          screenIdsToRemove.forEach((sid) => affectedScreens.add(sid));
        }
      }
    }

    const updatedVideo = await prisma.video.update({
      where: { id },
      data: {
        title:
          title !== undefined && typeof title === 'string' && title.trim()
            ? title.trim()
            : existingVideo.title,
        userId: updatedUserId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            plan: {
              select: { id: true, name: true, maxVideosPerScreen: true },
            },
          },
        },
        schedules: {
          include: { screen: true },
        },
      },
    });

    // Notificar MQTT a pantallas afectadas
    for (const screenId of affectedScreens) {
      try {
        await publishSyncEvent(screenId);
      } catch (mqttErr) {
        console.warn(`[WARN] Error sync MQTT a pantalla ${screenId}:`, mqttErr);
      }
    }

    return NextResponse.json({
      success: true,
      video: updatedVideo,
      affectedScreensCount: affectedScreens.size,
    });
  } catch (error: any) {
    console.error('Error updating video:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar el video' },
      { status: 500 }
    );
  }
}

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
