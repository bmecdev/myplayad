import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { publishSyncEvent } from '@/lib/mqttPublisher';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params;
    const body = await request.json();
    const { screenIds: newScreenIds } = body;

    if (!Array.isArray(newScreenIds)) {
      return NextResponse.json({ error: 'Invalid screenIds' }, { status: 400 });
    }

    // Get current assignments to know which screens are affected
    const currentSchedules = await prisma.schedule.findMany({
      where: { videoId }
    });
    
    const currentScreenIds = currentSchedules.map(s => s.screenId);
    
    // Calculate which screens are added and which are removed
    const addedScreens = newScreenIds.filter((id: string) => !currentScreenIds.includes(id));
    const removedScreens = currentScreenIds.filter(id => !newScreenIds.includes(id));
    
    // Screens that need to be notified
    const affectedScreens = new Set([...addedScreens, ...removedScreens]);

    // 1. Delete all existing schedules for this video
    await prisma.schedule.deleteMany({
      where: { videoId }
    });

    // 2. Create new schedules for each selected screen
    if (newScreenIds.length > 0) {
      const schedulesToCreate = newScreenIds.map((screenId: string) => ({
        screenId,
        videoId,
        startDate: new Date(),
        isActive: true,
      }));

      await prisma.schedule.createMany({
        data: schedulesToCreate
      });
    }

    // 3. Notify all affected screens
    for (const screenId of affectedScreens) {
      await publishSyncEvent(screenId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating video screens:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
