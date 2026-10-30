import { NextResponse } from 'next/server';
import { processScreenPowerSchedules } from '@/lib/powerScheduler';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await processScreenPowerSchedules();
  return NextResponse.json(result);
}

export async function POST() {
  const result = await processScreenPowerSchedules();
  return NextResponse.json(result);
}
