import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { publishPowerCommand } from '@/lib/mqttPublisher';

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (!['POWER_ON', 'POWER_OFF'].includes(action)) {
      return NextResponse.json({ error: 'Acción inválida. Usa: POWER_ON o POWER_OFF' }, { status: 400 });
    }

    const newDisplayState = action === 'POWER_ON' ? 'ON' : 'OFF';

    // 1. Super Administrador (Toda la plataforma)
    if (currentUser.role === 'SUPER_ADMIN') {
      await publishPowerCommand({
        action,
        broadcast: true,
        triggeredBy: currentUser.username,
      });

      const updated = await prisma.screen.updateMany({
        data: { displayState: newDisplayState },
      });

      return NextResponse.json({
        success: true,
        action,
        count: updated.count,
        message:
          action === 'POWER_ON'
            ? `Se emitió orden de encendido a todas las pantallas (${updated.count} pantallas).`
            : `Se emitió orden de apagado a todas las pantallas (${updated.count} pantallas).`,
      });
    }

    // 2. Cliente (Todas sus pantallas asignadas)
    const clientScreens = await prisma.screen.findMany({
      where: { userId: currentUser.id },
      select: { id: true, name: true },
    });

    if (clientScreens.length === 0) {
      return NextResponse.json(
        { error: 'No tienes pantallas asignadas actualmente.' },
        { status: 400 }
      );
    }

    for (const s of clientScreens) {
      await publishPowerCommand({
        action,
        screenId: s.id,
        triggeredBy: currentUser.username,
      });
    }

    await prisma.screen.updateMany({
      where: { userId: currentUser.id },
      data: { displayState: newDisplayState },
    });

    return NextResponse.json({
      success: true,
      action,
      count: clientScreens.length,
      message:
        action === 'POWER_ON'
          ? `Se encendieron ${clientScreens.length} pantallas asignadas a tu cuenta.`
          : `Se apagaron / pusieron en reposo ${clientScreens.length} pantallas asignadas a tu cuenta.`,
    });
  } catch (error) {
    console.error('Error controlling all screens power:', error);
    return NextResponse.json({ error: 'Error controlando energía de pantallas' }, { status: 500 });
  }
}
