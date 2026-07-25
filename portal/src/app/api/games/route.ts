import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const games = await prisma.game.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(games);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching games' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, slug, description } = body;

    const game = await prisma.game.create({
      data: { name, slug, description },
    });

    return NextResponse.json(game, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error creating game' }, { status: 500 });
  }
}
