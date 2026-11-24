import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

// Función para generar un código único fácil de leer para el cliente (ej: "WIN-7492")
function generateClaimCode(prefix = 'WIN'): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Sin 0, 1, O, I para evitar confusiones
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${code}`;
}

function setCorsHeaders(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return res;
}

export async function OPTIONS() {
  return setCorsHeaders(new NextResponse(null, { status: 200 }));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { screenId, gameSlug, score, name, email, whatsapp, termsAccepted } = body;

    if (!screenId || !name || !email || !whatsapp) {
      return setCorsHeaders(
        NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
      );
    }

    if (!termsAccepted) {
      return setCorsHeaders(
        NextResponse.json(
          { error: 'Debes aceptar los términos y el tratamiento de datos para reclamar el premio.' },
          { status: 400 }
        )
      );
    }

    // 1. Obtener la pantalla y el cliente dueño (Multi-tenant)
    const screen = await prisma.screen.findUnique({
      where: { id: screenId },
      include: {
        user: true,
      },
    });

    if (!screen || !screen.userId) {
      return setCorsHeaders(
        NextResponse.json(
          { error: 'Pantalla no válida o no tiene cliente asignado' },
          { status: 404 }
        )
      );
    }

    // 2. Verificar que exista un juego con premio activo en esta pantalla
    const now = new Date();
    const activeSchedule = await prisma.schedule.findFirst({
      where: {
        screenId,
        gameId: { not: null },
        isActive: true,
        startDate: { lte: now },
        OR: [
          { endDate: null },
          { endDate: { gt: now } },
        ],
        rewardEnabled: true,
      },
    });

    if (!activeSchedule || !activeSchedule.rewardTitle) {
      return setCorsHeaders(
        NextResponse.json(
          { error: 'Esta pantalla no tiene premios activos actualmente.' },
          { status: 400 }
        )
      );
    }

    const currentScore = parseInt(String(score || 0), 10);
    if (currentScore < activeSchedule.rewardMinScore) {
      return setCorsHeaders(
        NextResponse.json(
          { 
            error: `El puntaje (${currentScore}) no alcanza el mínimo requerido (${activeSchedule.rewardMinScore}) para este premio.` 
          },
          { status: 400 }
        )
      );
    }

    // 3. Calcular tiempo de expiración (ej: 15 o 30 minutos desde ahora)
    const expireMinutes = activeSchedule.rewardExpireMinutes || 15;
    const expiresAt = new Date(Date.now() + expireMinutes * 60 * 1000);

    // 4. Generar código único y guardar el lead bajo el userId del cliente (Multi-tenant)
    let claimCode = generateClaimCode('WIN');
    let attempts = 0;
    while (attempts < 5) {
      const exists = await prisma.rewardLead.findUnique({ where: { code: claimCode } });
      if (!exists) break;
      claimCode = generateClaimCode('WIN');
      attempts++;
    }

    const lead = await prisma.rewardLead.create({
      data: {
        code: claimCode,
        name: String(name).trim(),
        email: String(email).trim().toLowerCase(),
        whatsapp: String(whatsapp).trim(),
        termsAccepted: true,
        gameSlug: String(gameSlug || 'game'),
        score: currentScore,
        rewardTitle: activeSchedule.rewardTitle,
        userId: screen.userId, // <- AISLAMIENTO MULTI-TENANT
        screenId: screen.id,
        status: 'PENDING',
        expiresAt,
      },
    });

    return setCorsHeaders(
      NextResponse.json({
        success: true,
        code: lead.code,
        rewardTitle: lead.rewardTitle,
        expiresAt: lead.expiresAt.toISOString(),
        expireMinutes,
        message: '¡Premio reclamado! Presenta este código en el mostrador antes de que expire el tiempo.',
      })
    );
  } catch (error) {
    console.error('Error in /api/rewards/claim:', error);
    return setCorsHeaders(
      NextResponse.json({ error: 'Error procesando el reclamo' }, { status: 500 })
    );
  }
}
