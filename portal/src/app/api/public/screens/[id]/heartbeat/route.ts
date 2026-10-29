import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function setCorsHeaders(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return res;
}

export async function OPTIONS() {
  return setCorsHeaders(new NextResponse(null, { status: 200 }));
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: screenId } = await params;
    const body = await request.json().catch(() => ({}));
    const { consoleId } = body || {};

    const updateData: { lastSeen: Date; consoleId?: string } = {
      lastSeen: new Date(),
    };

    if (consoleId && typeof consoleId === 'string' && consoleId.trim()) {
      updateData.consoleId = consoleId.trim();
    }

    await prisma.screen.update({
      where: { id: screenId },
      data: updateData,
    });

    return setCorsHeaders(NextResponse.json({ success: true }));
  } catch (error) {
    console.error('Error updating screen heartbeat:', error);
    return setCorsHeaders(NextResponse.json({ error: 'Internal Server Error' }, { status: 500 }));
  }
}
