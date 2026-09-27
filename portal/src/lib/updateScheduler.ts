import prisma from '@/lib/prisma';
import { publishUpdateCommand } from '@/lib/mqttPublisher';

export async function processDueUpdateSchedules() {
  try {
    const now = new Date();
    const dueSchedules = await prisma.updateSchedule.findMany({
      where: {
        status: 'PENDING',
        scheduledAt: { lte: now },
      },
      include: {
        screen: true,
        user: {
          include: {
            screens: true,
          },
        },
      },
    });

    if (dueSchedules.length === 0) return { processed: 0 };

    for (const schedule of dueSchedules) {
      try {
        if (schedule.targetType === 'SYSTEM_ALL') {
          await publishUpdateCommand({
            broadcast: true,
            triggeredBy: `schedule_${schedule.id}`,
          });
        } else if (schedule.targetType === 'CLIENT_ALL' && schedule.user) {
          const screens = schedule.user.screens || [];
          for (const s of screens) {
            await publishUpdateCommand({
              screenId: s.id,
              triggeredBy: `schedule_${schedule.id}`,
            });
          }
        } else if (schedule.screenId) {
          await publishUpdateCommand({
            screenId: schedule.screenId,
            triggeredBy: `schedule_${schedule.id}`,
          });
        }

        await prisma.updateSchedule.update({
          where: { id: schedule.id },
          data: {
            status: 'EXECUTED',
            executedAt: new Date(),
            resultNote: 'Orden de actualización enviada por MQTT a la pantalla.',
          },
        });
      } catch (err: any) {
        console.error(`Error processing update schedule ${schedule.id}:`, err);
        await prisma.updateSchedule.update({
          where: { id: schedule.id },
          data: {
            status: 'FAILED',
            resultNote: err.message || 'Error procesando actualización',
          },
        });
      }
    }

    return { processed: dueSchedules.length };
  } catch (error) {
    console.error('Error in processDueUpdateSchedules:', error);
    return { processed: 0, error };
  }
}
