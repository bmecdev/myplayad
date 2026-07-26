import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const prodGamesDir = '/srv/games';
    const localGamesDir = path.join(process.cwd(), '../games');
    const gamesDir = fs.existsSync(prodGamesDir) ? prodGamesDir : localGamesDir;
    let availableSlugs: string[] = [];
    
    if (fs.existsSync(gamesDir)) {
      availableSlugs = fs.readdirSync(gamesDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
        .map(dirent => dirent.name);
    } else {
      console.warn(`Games directory not found at ${prodGamesDir} or ${localGamesDir}`);
    }

    // Auto-sync: upsert every game folder found
    for (const slug of availableSlugs) {
      const name = slug.charAt(0).toUpperCase() + slug.slice(1);
      await prisma.game.upsert({
        where: { slug },
        update: {}, // Don't overwrite existing names/descriptions if any
        create: { slug, name, description: `Juego de ${name}` },
      });
    }

    const games = await prisma.game.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(games);
  } catch (error) {
    console.error('Error auto-syncing games:', error);
    return NextResponse.json({ error: 'Error fetching games' }, { status: 500 });
  }
}
