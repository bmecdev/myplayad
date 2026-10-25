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

    // Consultar estado de la pantalla y de su cliente propietario
    const screen = await prisma.screen.findUnique({
      where: { id: screenId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            isActive: true,
            planStartsAt: true,
            planEndsAt: true,
          },
        },
      },
    });

    // Si el cliente propietario está inactivo o su plan no está vigente,
    // la pantalla NO reproduce ni videos ni juegos (entra en standby suspendido)
    if (screen?.user) {
      const isClientInactive = screen.user.isActive === false;
      const isPlanExpired = screen.user.planEndsAt ? new Date(screen.user.planEndsAt) < now : false;
      const isPlanPending = screen.user.planStartsAt ? new Date(screen.user.planStartsAt) > now : false;

      if (isClientInactive || isPlanExpired || isPlanPending) {
        return setCorsHeaders(
          NextResponse.json({
            type: 'standby',
            url: null,
            clientActive: false,
            inactive: true,
            reason: isClientInactive
              ? 'CLIENT_INACTIVE'
              : isPlanExpired
              ? 'PLAN_EXPIRED'
              : 'PLAN_PENDING',
            message: isClientInactive
              ? 'Pantalla suspendida: Cliente inactivo'
              : isPlanExpired
              ? 'Pantalla suspendida: Plan expirado'
              : 'Pantalla en espera: Plan no iniciado',
            upcoming: [],
          })
        );
      }
    }

    // First try to find an active GAME schedule
    let currentSchedule = await prisma.schedule.findFirst({
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
      orderBy: {
        startDate: 'desc'
      },
      include: {
        game: true,
        video: true,
      }
    });

    // If no active game, fall back to an active VIDEO schedule
    if (!currentSchedule) {
      currentSchedule = await prisma.schedule.findFirst({
        where: {
          screenId,
          videoId: { not: null },
          isActive: true,
          startDate: { lte: now },
          OR: [
            { endDate: null },
            { endDate: { gt: now } }
          ]
        },
        orderBy: {
          startDate: 'desc'
        },
        include: {
          game: true,
          video: true,
        }
      });
    }

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
        responseData.url = `https://games.myplayad.com/${currentSchedule.game.slug}?screenId=${screenId}`;
      } else if (currentSchedule.video) {
        responseData.type = 'video';
        responseData.url = `https://videos.myplayad.com/${currentSchedule.video.filename}`;
      }
    }

    return setCorsHeaders(NextResponse.json(responseData));
  } catch (error) {
    console.error('Error fetching current screen schedule:', error);
    const details = error instanceof Error ? error.message : String(error);
    return setCorsHeaders(NextResponse.json({ error: 'Internal Server Error', details }, { status: 500 }));
  }
}
