import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const schedule = await prisma.updateSchedule.findUnique({
      where: { id },
    });

    if (!schedule) {
      return NextResponse.json({ error: 'Programación no encontrada' }, { status: 404 });
    }

    // Si es cliente, verificar que le pertenezca
    if (currentUser.role === 'CLIENT' && schedule.userId !== currentUser.id) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    await prisma.updateSchedule.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    return NextResponse.json({ success: true, message: 'Actualización programada cancelada.' });
  } catch (error) {
    console.error('Error cancelling update schedule:', error);
    return NextResponse.json({ error: 'Error cancelando actualización' }, { status: 500 });
  }
}
