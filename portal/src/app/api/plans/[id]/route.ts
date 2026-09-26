import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const plan = await prisma.plan.findUnique({
      where: { id },
      include: {
        games: true,
        users: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 });
    }

    return NextResponse.json(plan);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching plan' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, slug, description, gameIds } = body;

    const existingPlan = await prisma.plan.findUnique({ where: { id } });
    if (!existingPlan) {
      return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 });
    }

    const updateData: any = {};
    if (name) updateData.name = String(name).trim();
    if (description !== undefined) updateData.description = description ? String(description).trim() : null;
    if (slug) {
      const cleanSlug = String(slug).trim();
      const duplicate = await prisma.plan.findUnique({ where: { slug: cleanSlug } });
      if (duplicate && duplicate.id !== id) {
        return NextResponse.json({ error: 'El identificador de plan ya está en uso' }, { status: 400 });
      }
      updateData.slug = cleanSlug;
    }

    if (Array.isArray(gameIds)) {
      updateData.games = {
        set: gameIds.map((gameId: string) => ({ id: gameId })),
      };
    }

    const updated = await prisma.plan.update({
      where: { id },
      data: updateData,
      include: {
        games: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating plan:', error);
    return NextResponse.json({ error: 'Error al actualizar plan' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;

    // Desasociar usuarios antes de borrar
    await prisma.user.updateMany({
      where: { planId: id },
      data: { planId: null },
    });

    await prisma.plan.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting plan:', error);
    return NextResponse.json({ error: 'Error al eliminar plan' }, { status: 500 });
  }
}
