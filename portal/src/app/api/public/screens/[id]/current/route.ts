import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Enable CORS for this public endpoint so screens can fetch it from other subdomains
function setCorsHeaders(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return res;
}

export async function OPTIONS() {
  return setCorsHeaders(new NextResponse(null, { status: 200 }));
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: screenId } = await params;
    const now = new Date();

    // Find the currently active schedule for this screen
    // It must be active, start date in the past, and end date in the future (or null)
    const currentSchedule = await prisma.schedule.findFirst({
      where: {
        screenId,
        isActive: true,
        startDate: { lte: now },
        OR: [
          { endDate: null },
          { endDate: { gt: now } }
        ]
      },
      orderBy: {
        startDate: 'desc' // If multiple overlap, take the most recently started one
      },
      include: {
        game: true,
        video: true,
      }
    });

    const futureSchedules = await prisma.schedule.findMany({
      where: {
        screenId,
        isActive: true,
        startDate: { gt: now }
      },
      orderBy: {
        startDate: 'asc'
      },
      take: 5,
      include: {
        game: true,
        video: true,
      }
    });

    const upcoming = futureSchedules.map(schedule => {
      let type = 'standby';
      let name = '';
      if (schedule.game) {
        type = 'game';
        name = schedule.game.name;
      } else if (schedule.video) {
        type = 'video';
        name = schedule.video.title;
      }
      return {
        type,
        name,
        startDate: schedule.startDate,
      };
    }).filter(s => s.type !== 'standby');

    let responseData: { type: string; url: string | null; upcoming: any[] } = { 
      type: 'standby', 
      url: null,
      upcoming
    };

    if (currentSchedule) {
      if (currentSchedule.game) {
        responseData.type = 'game';
        responseData.url = `http://games.myplayad.com/${currentSchedule.game.slug}?screenId=${screenId}`;
      } else if (currentSchedule.video) {
        responseData.type = 'video';
        responseData.url = `https://videos.myplayad.com/${currentSchedule.video.filename}`;
      }
    }

    return setCorsHeaders(NextResponse.json(responseData));
  } catch (error) {
    console.error('Error fetching current screen schedule:', error);
    return setCorsHeaders(NextResponse.json({ error: 'Internal Server Error' }, { status: 500 }));
  }
}
