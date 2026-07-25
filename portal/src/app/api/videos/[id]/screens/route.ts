import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params;
    const body = await request.json();
    const { screenIds } = body;

    if (!Array.isArray(screenIds)) {
      return NextResponse.json({ error: 'Invalid screenIds' }, { status: 400 });
    }

    // 1. Delete all existing schedules for this video
    await prisma.schedule.deleteMany({
      where: { videoId }
    });

    // 2. Create new schedules for each selected screen
    if (screenIds.length > 0) {
      const schedulesToCreate = screenIds.map((screenId: string) => ({
        screenId,
        videoId,
        startDate: new Date(),
        isActive: true,
      }));

      await prisma.schedule.createMany({
        data: schedulesToCreate
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating video screens:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
