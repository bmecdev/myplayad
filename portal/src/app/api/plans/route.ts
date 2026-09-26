import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const plans = await prisma.plan.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        games: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    return NextResponse.json(plans);
  } catch (error) {
    console.error('Error fetching plans:', error);
    return NextResponse.json({ error: 'Error al obtener planes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Acceso denegado. Solo el Super Administrador puede crear planes.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, slug, description, gameIds } = body;

    if (!name) {
      return NextResponse.json({ error: 'El nombre del plan es obligatorio' }, { status: 400 });
    }

    const cleanSlug = (slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')).trim();

    const existing = await prisma.plan.findUnique({
      where: { slug: cleanSlug },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Ya existe un plan con el identificador "${cleanSlug}".` },
        { status: 400 }
      );
    }

    const newPlan = await prisma.plan.create({
      data: {
        name: String(name).trim(),
        slug: cleanSlug,
        description: description ? String(description).trim() : null,
        games: Array.isArray(gameIds) && gameIds.length > 0
          ? {
              connect: gameIds.map((id: string) => ({ id })),
            }
          : undefined,
      },
      include: {
        games: true,
      },
    });

    return NextResponse.json(newPlan, { status: 201 });
  } catch (error) {
    console.error('Error creating plan:', error);
    return NextResponse.json({ error: 'Error al crear plan' }, { status: 500 });
  }
}
