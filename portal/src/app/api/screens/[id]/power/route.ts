import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { publishPowerCommand } from '@/lib/mqttPublisher';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (!['POWER_ON', 'POWER_OFF', 'REBOOT'].includes(action)) {
      return NextResponse.json({ error: 'Acción inválida. Usa: POWER_ON, POWER_OFF o REBOOT' }, { status: 400 });
    }

    const screen = await prisma.screen.findUnique({
      where: { id },
    });

    if (!screen) {
      return NextResponse.json({ error: 'Pantalla no encontrada' }, { status: 404 });
    }

    // Verificar permisos: Cliente solo sobre sus pantallas
    if (currentUser.role === 'CLIENT' && screen.userId !== currentUser.id) {
      return NextResponse.json(
        { error: 'Acceso denegado. No tienes permisos para controlar la energía de esta pantalla.' },
        { status: 403 }
      );
    }

    // Enviar orden por MQTT
    await publishPowerCommand({
      action,
      screenId: id,
      triggeredBy: currentUser.username,
    });

    let newDisplayState = screen.displayState;
    if (action === 'POWER_ON') newDisplayState = 'ON';
    if (action === 'POWER_OFF') newDisplayState = 'OFF';

    // Actualizar estado en base de datos
    const updated = await prisma.screen.update({
      where: { id },
      data: { displayState: newDisplayState },
    });

    return NextResponse.json({
      success: true,
      action,
      displayState: updated.displayState,
      message:
        action === 'POWER_ON'
          ? `Pantalla "${screen.name}" encendida.`
          : action === 'POWER_OFF'
          ? `Pantalla "${screen.name}" puesta en reposo / apagada.`
          : `Reinicio ordenado para "${screen.name}".`,
    });
  } catch (error) {
    console.error('Error controlling screen power:', error);
    return NextResponse.json({ error: 'Error controlando energía de pantalla' }, { status: 500 });
  }
}
