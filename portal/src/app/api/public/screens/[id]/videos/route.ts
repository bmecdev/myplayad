import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: screenId } = await params;
    const now = new Date();

    // Comprobar si el cliente propietario está inactivo o suspendido
    const screen = await prisma.screen.findUnique({
      where: { id: screenId },
      include: {
        user: {
          select: {
            id: true,
            isActive: true,
            planStartsAt: true,
            planEndsAt: true,
          },
        },
      },
    });

    if (screen?.user) {
      const isClientInactive = screen.user.isActive === false;
      const isPlanExpired = screen.user.planEndsAt ? new Date(screen.user.planEndsAt) < now : false;
      const isPlanPending = screen.user.planStartsAt ? new Date(screen.user.planStartsAt) > now : false;

      if (isClientInactive || isPlanExpired || isPlanPending) {
        return NextResponse.json({ videos: [], clientActive: false });
      }
    }

    // Find all active video schedules for this screen
    const schedules = await prisma.schedule.findMany({
      where: {
        screenId,
        videoId: { not: null },
        isActive: true,
      },
      include: {
        video: true,
      },
      orderBy: {
        createdAt: 'asc',
      }
    });

    const videos = schedules
      .map(s => s.video?.filename)
      .filter((filename): filename is string => Boolean(filename));

    return NextResponse.json({ videos });
  } catch (error) {
    console.error('Error fetching screen videos:', error);
    return NextResponse.json({ error: 'Internal Server Error', videos: [] }, { status: 500 });
  }
}
