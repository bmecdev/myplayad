import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: screenId } = await params;
    const body = await request.json();
    const { gameId, startDate } = body;

    if (!gameId) {
      return NextResponse.json({ error: 'Missing gameId' }, { status: 400 });
    }

    // First, deactivate any existing active game schedules for this screen
    await prisma.schedule.updateMany({
      where: {
        screenId,
        gameId: { not: null },
        isActive: true,
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

    // To remove the game, we simply deactivate any game schedules for this screen.
    // The current active schedule logic will fall back to the most recently started video schedule.
    await prisma.schedule.updateMany({
      where: {
        screenId,
        gameId: { not: null },
        isActive: true,
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
