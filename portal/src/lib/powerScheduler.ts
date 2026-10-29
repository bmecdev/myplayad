import prisma from '@/lib/prisma';
import { publishPowerCommand } from '@/lib/mqttPublisher';

export interface PowerScheduleConfig {
  autoPowerEnabled?: boolean | null;
  powerOnTime?: string | null;  // "HH:mm" (24h)
  powerOffTime?: string | null; // "HH:mm" (24h)
}

/**
 * Obtiene la hora actual en formato "HH:mm" en la zona horaria de la plataforma (por defecto America/Bogota)
 */
export function getCurrentTimeString(date: Date = new Date(), timeZone: string = 'America/Bogota'): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return formatter.format(date);
  } catch {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }
}

/**
 * Determina si una pantalla debe estar encendida según su horario programado
 */
export function isScreenScheduledOn(
  screen: PowerScheduleConfig,
  currentDate: Date = new Date(),
  timeZone: string = 'America/Bogota'
): boolean {
  if (!screen.autoPowerEnabled) {
    // Si la programación automática está desactivada, la pantalla permanece encendida
    return true;
  }

  const onTime = screen.powerOnTime?.trim();
  const offTime = screen.powerOffTime?.trim();

  // Si no se configuró alguna hora válida, se asume encendida
  if (!onTime || !offTime) {
    return true;
  }

  const currentTime = getCurrentTimeString(currentDate, timeZone);

  if (onTime === offTime) {
    // Misma hora de encendido y apagado: 24h encendida
    return true;
  }

  if (onTime < offTime) {
    // Horario diurno regular (ej: 08:00 a 22:00)
    // Encendido entre onTime (inclusive) y offTime (exclusivo)
    return currentTime >= onTime && currentTime < offTime;
  } else {
    // Horario nocturno que cruza medianoche (ej: 20:00 a 06:00)
    // Encendido si es después de onTime O antes de offTime
    return currentTime >= onTime || currentTime < offTime;
  }
}

/**
 * Procesa todas las pantallas registradas y envía comandos POWER_ON / POWER_OFF
 * vía MQTT si su estado actual no coincide con el horario programado.
 */
export async function processScreenPowerSchedules() {
  try {
    const screens = await prisma.screen.findMany({
      where: {
        autoPowerEnabled: true,
      },
    });

    const now = new Date();
    const currentTimeStr = getCurrentTimeString(now);
    const results: { screenId: string; name: string; action: string }[] = [];

    for (const screen of screens) {
      if (!screen.powerOnTime || !screen.powerOffTime) continue;

      const shouldBeOn = isScreenScheduledOn(screen, now);
      const expectedDisplayState = shouldBeOn ? 'ON' : 'OFF';

      // Si el estado de la pantalla difiere del que manda el horario:
      if (screen.displayState !== expectedDisplayState) {
        const action = shouldBeOn ? 'POWER_ON' : 'POWER_OFF';
        console.log(
          `[PowerScheduler] ${currentTimeStr} - Pantalla "${screen.name}" (${screen.id}) pasando a ${action} (Horario: ${screen.powerOnTime} - ${screen.powerOffTime})`
        );

        try {
          await publishPowerCommand({
            action: shouldBeOn ? 'POWER_ON' : 'POWER_OFF',
            screenId: screen.id,
            triggeredBy: 'power_scheduler',
          });
          await prisma.screen.update({
            where: { id: screen.id },
            data: { displayState: expectedDisplayState },
          });
          results.push({ screenId: screen.id, name: screen.name, action });
        } catch (err: any) {
          console.error(`[PowerScheduler] Error enviando comando a pantalla ${screen.id}:`, err?.message);
        }
      }
    }

    return {
      success: true,
      currentTime: currentTimeStr,
      processed: screens.length,
      actionsTriggered: results,
    };
  } catch (error: any) {
    console.error('[PowerScheduler] Error en processScreenPowerSchedules:', error?.message);
    return {
      success: false,
      error: error?.message || 'Error procesando horarios de encendido y apagado',
    };
  }
}

// Iniciar un chequeo periódico en segundo plano en el proceso de Node.js (cada 60 segundos)
const globalPowerScheduler = globalThis as unknown as {
  _powerSchedulerInterval?: NodeJS.Timeout;
};

if (typeof window === 'undefined' && !globalPowerScheduler._powerSchedulerInterval) {
  // Ejecutar primera comprobación tras 10 segundos
  setTimeout(() => {
    processScreenPowerSchedules().catch((err) =>
      console.warn('[PowerScheduler] Inicialización error:', err?.message)
    );
  }, 10000);

  // Intervalo recurrente de 60 segundos
  globalPowerScheduler._powerSchedulerInterval = setInterval(() => {
    processScreenPowerSchedules().catch((err) =>
      console.warn('[PowerScheduler] Error en tick periódico:', err?.message)
    );
  }, 60 * 1000);
}
