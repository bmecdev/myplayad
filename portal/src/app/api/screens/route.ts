import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const screens = await prisma.screen.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        schedules: {
          include: {
            game: true,
            video: true,
          }
        }
      }
    });
    return NextResponse.json(screens);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching screens' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, location, description } = body;

    const screen = await prisma.screen.create({
      data: { name, location, description },
    });

    return NextResponse.json(screen, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error creating screen' }, { status: 500 });
  }
}
