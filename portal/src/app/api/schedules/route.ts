import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { publishSyncEvent } from '@/lib/mqttPublisher';

export async function GET() {
  try {
    const schedules = await prisma.schedule.findMany({
      orderBy: { startDate: 'desc' },
      include: {
        screen: true,
        game: true,
        video: true,
      }
    });
    return NextResponse.json(schedules);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching schedules' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { screenId, gameId, videoId, startDate, endDate, isActive } = body;

    const schedule = await prisma.schedule.create({
      data: { 
        screenId, 
        gameId: gameId || null, 
        videoId: videoId || null, 
        startDate: new Date(startDate), 
        endDate: endDate ? new Date(endDate) : null,
        isActive: isActive !== undefined ? isActive : true
      },
      include: {
        game: true,
        video: true,
        screen: true
      }
    });

    // Notify screen
    await publishSyncEvent(screenId);

    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error creating schedule' }, { status: 500 });
  }
}
