import { NextResponse } from 'next/server';
import { processDueUpdateSchedules } from '@/lib/updateScheduler';

export async function GET() {
  const result = await processDueUpdateSchedules();
  return NextResponse.json(result);
}

export async function POST() {
  const result = await processDueUpdateSchedules();
  return NextResponse.json(result);
}
