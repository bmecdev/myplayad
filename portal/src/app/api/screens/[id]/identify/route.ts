import { NextResponse } from 'next/server';
import { publishIdentifyEvent } from '@/lib/mqttPublisher';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: screenId } = await params;
    
    // Publish MQTT identify event
    await publishIdentifyEvent(screenId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error triggering identify:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
