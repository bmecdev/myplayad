import { NextResponse } from 'next/server';
import { processDueUpdateSchedules } from '@/lib/updateScheduler';
import { processScreenPowerSchedules } from '@/lib/powerScheduler';

export async function GET() {
  const [updates, power] = await Promise.all([
    processDueUpdateSchedules(),
    processScreenPowerSchedules(),
  ]);
  return NextResponse.json({ updates, power });
}

export async function POST() {
  const [updates, power] = await Promise.all([
    processDueUpdateSchedules(),
    processScreenPowerSchedules(),
  ]);
  return NextResponse.json({ updates, power });
}
