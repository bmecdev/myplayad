import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: screenId } = await params;
    const body = await request.json();
    const { gameId, startDate, endDate } = body;

    if (!gameId) {
      return NextResponse.json({ error: 'Missing gameId' }, { status: 400 });
    }

    const now = new Date();
    // First, deactivate any existing currently active game schedules for this screen
    await prisma.schedule.updateMany({
      where: {
        screenId,
        gameId: { not: null },
        isActive: true,
        startDate: { lte: now },
        OR: [
          { endDate: null },
          { endDate: { gt: now } }
        ]
      },
      data: {
        isActive: false,
      }
    });

    // Create the new game schedule
    const schedule = await prisma.schedule.create({
      data: {
        screenId,
        gameId,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        isActive: true,
      }
    });

    return NextResponse.json({ success: true, schedule });
  } catch (error) {
    console.error('Error assigning game:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: screenId } = await params;

    const now = new Date();
    // To remove the game, we simply deactivate any CURRENTLY RUNNING game schedules for this screen.
    // Future schedules will remain intact.
    await prisma.schedule.updateMany({
      where: {
        screenId,
        gameId: { not: null },
        isActive: true,
        startDate: { lte: now },
        OR: [
          { endDate: null },
          { endDate: { gt: now } }
        ]
      },
      data: {
        isActive: false,
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing game:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
