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

    let allowedTargetScreenIds = requestedScreenIds;

    // Si es CLIENT, solo puede gestionar sus propias pantallas
    if (currentUser.role === 'CLIENT') {
      const clientScreens = await prisma.screen.findMany({
        where: { userId: currentUser.id },
        select: { id: true },
      });
      const clientScreenIdSet = new Set(clientScreens.map(s => s.id));
      allowedTargetScreenIds = requestedScreenIds.filter((id: string) => clientScreenIdSet.has(id));

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
