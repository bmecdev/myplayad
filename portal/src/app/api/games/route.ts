import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

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

    // Auto-sync: registrar cada carpeta de juego en la BD si no existe
    for (const slug of availableSlugs) {
      const name = slug.charAt(0).toUpperCase() + slug.slice(1);
      await prisma.game.upsert({
        where: { slug },
        update: {},
        create: { slug, name, description: `Juego arcade de ${name}` },
      });
    }

    const allGames = await prisma.game.findMany({
      orderBy: { name: 'asc' },
    });

    const isClient = currentUser.role === 'CLIENT';
    const allowedGameIds = new Set(currentUser.plan?.games?.map(g => g.id) || []);

    const url = new URL(request.url);
    const showAll = url.searchParams.get('all') === 'true';

    // Si es CLIENT y no solicita catálogo completo para visualización, devolver sólo sus juegos permitidos
    if (isClient && !showAll) {
      const permittedGames = allGames.filter(g => allowedGameIds.has(g.id));
      return NextResponse.json(permittedGames);
    }

    // Si solicita catálogo completo o es SUPER_ADMIN
    const responseGames = allGames.map(g => ({
      ...g,
      isIncluded: !isClient || allowedGameIds.has(g.id),
    }));

    return NextResponse.json(responseGames);
  } catch (error) {
    console.error('Error auto-syncing games:', error);
    return NextResponse.json({ error: 'Error fetching games' }, { status: 500 });
  }
}
