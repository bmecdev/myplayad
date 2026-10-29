import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { publishSyncEvent } from '@/lib/mqttPublisher';
import { getCurrentUser } from '@/lib/auth';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id: videoId } = await params;
    const body = await request.json();
    const { screenIds: requestedScreenIds } = body;

    if (!Array.isArray(requestedScreenIds)) {
      return NextResponse.json({ error: 'Invalid screenIds' }, { status: 400 });
    }

    const video = await prisma.video.findUnique({ where: { id: videoId } });
    if (!video) {
      return NextResponse.json({ error: 'Video no encontrado' }, { status: 404 });
    }

    // Segmentación estricta: Si el video pertenece a un cliente, ninguna pantalla de otro cliente puede ser asignada
    if (video.userId && requestedScreenIds.length > 0) {
      const foreignScreens = await prisma.screen.findMany({
        where: {
          id: { in: requestedScreenIds },
          userId: { not: video.userId },
        },
        select: { name: true },
      });

      if (foreignScreens.length > 0) {
        return NextResponse.json(
          {
            error: `Segmentación de videos por cliente: Las pantallas [${foreignScreens.map((s) => s.name).join(', ')}] pertenecen a otro cliente y no pueden recibir este video.`,
          },
          { status: 400 }
        );
      }
    }

    let allowedTargetScreenIds = requestedScreenIds;

    // Si es CLIENT, solo puede gestionar sus propias pantallas y sus propios videos
    if (currentUser.role === 'CLIENT') {
      if (video.userId !== currentUser.id) {
        return NextResponse.json(
          { error: 'Acceso denegado: Este video no te pertenece.' },
          { status: 403 }
        );
      }
      const clientScreens = await prisma.screen.findMany({
        where: { userId: currentUser.id },
        select: { id: true, name: true },
      });
      const clientScreenIdSet = new Set(clientScreens.map(s => s.id));
      allowedTargetScreenIds = requestedScreenIds.filter((id: string) => clientScreenIdSet.has(id));

      // Validar límite del plan en cada pantalla destino
      const maxAllowed = currentUser.plan?.maxVideosPerScreen ?? 15;
      for (const targetId of allowedTargetScreenIds) {
        const otherVideosCount = await prisma.schedule.count({
          where: {
            screenId: targetId,
            videoId: { not: null, notIn: [videoId] },
            isActive: true,
          },
        });
        if (otherVideosCount + 1 > maxAllowed) {
          const screenObj = clientScreens.find(s => s.id === targetId);
          return NextResponse.json(
            {
              error: `La pantalla "${screenObj?.name || 'seleccionada'}" ya tiene el máximo de ${maxAllowed} videos permitidos según tu plan (${currentUser.plan?.name || 'Básico'}). Desasigna un video previo para continuar.`,
            },
            { status: 403 }
          );
        }
      }

      // Mantener asignaciones de pantallas que pertenecen a otros clientes
      const otherScreensSchedules = await prisma.schedule.findMany({
        where: {
          videoId,
          screen: {
            userId: { not: currentUser.id },
          },
        },
        select: { screenId: true },
      });

      const currentClientSchedules = await prisma.schedule.findMany({
        where: {
          videoId,
          screen: { userId: currentUser.id },
        },
      });

      const currentClientScreenIds = currentClientSchedules.map(s => s.screenId);
      const affectedScreens = new Set([
        ...allowedTargetScreenIds.filter(id => !currentClientScreenIds.includes(id)),
        ...currentClientScreenIds.filter(id => !allowedTargetScreenIds.includes(id)),
      ]);

      // Borrar solo las programaciones de este video en las pantallas de este cliente
      await prisma.schedule.deleteMany({
        where: {
          videoId,
          screen: { userId: currentUser.id },
        },
      });

      if (allowedTargetScreenIds.length > 0) {
        await prisma.schedule.createMany({
          data: allowedTargetScreenIds.map((screenId: string) => ({
            screenId,
            videoId,
            startDate: new Date(),
            isActive: true,
          })),
        });
      }

      for (const screenId of affectedScreens) {
        await publishSyncEvent(screenId);
      }

      return NextResponse.json({ success: true });
    }

    // Super Admin: gestión global
    const currentSchedules = await prisma.schedule.findMany({
      where: { videoId },
    });
    
    const currentScreenIds = currentSchedules.map(s => s.screenId);
    const addedScreens = requestedScreenIds.filter((id: string) => !currentScreenIds.includes(id));
    const removedScreens = currentScreenIds.filter(id => !requestedScreenIds.includes(id));
    const affectedScreens = new Set([...addedScreens, ...removedScreens]);

    await prisma.schedule.deleteMany({
      where: { videoId },
    });

    if (requestedScreenIds.length > 0) {
      await prisma.schedule.createMany({
        data: requestedScreenIds.map((screenId: string) => ({
          screenId,
          videoId,
          startDate: new Date(),
          isActive: true,
        })),
      });
    }

    for (const screenId of affectedScreens) {
      await publishSyncEvent(screenId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating video screens:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
