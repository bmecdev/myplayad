import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { publishSyncEvent } from '@/lib/mqttPublisher';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // Get screenId before deleting to notify it
    const schedule = await prisma.schedule.findUnique({ where: { id } });
    if (!schedule) {
        return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    await prisma.schedule.delete({
      where: { id },
    });
    
    await publishSyncEvent(schedule.screenId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error deleting schedule' }, { status: 500 });
  }
}
