import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const now = new Date();

    const screen = await prisma.screen.findUnique({
      where: { id },
      include: {
        schedules: {
          include: {
            video: true,
            game: true,
          },
          orderBy: { startDate: 'desc' }
        }
      }
    });

    if (!screen) {
      return NextResponse.json({ error: 'Screen not found' }, { status: 404 });
    }

    // A video belongs to this screen if there's a schedule for it
    const videos = screen.schedules
      .filter(s => s.videoId && s.video)
      .map(s => s.video)
      .filter((v, i, self) => i === self.findIndex((t) => t?.id === v?.id)); // unique videos

    // Find if there's an active or future game schedule
    const activeGameSchedule = screen.schedules.find(s => 
      s.gameId && 
      s.isActive && 
      (!s.endDate || s.endDate > now)
    );

    return NextResponse.json({
      screen: {
        id: screen.id,
        name: screen.name,
        location: screen.location,
        description: screen.description,
        lastSeen: screen.lastSeen,
      },
      videos,
      activeGameSchedule: activeGameSchedule || null
    });
  } catch (error) {
    console.error('Error fetching screen details:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.screen.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error deleting screen' }, { status: 500 });
  }
}
