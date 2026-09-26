import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, hashPassword } from '@/lib/auth';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        planId: true,
        plan: true,
        screens: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching user' }, { status: 500 });
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
    const { username, password, name, email, role, planId } = body;

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const updateData: any = {};
    if (name) updateData.name = String(name).trim();
    if (email !== undefined) updateData.email = email ? String(email).trim() : null;
    if (role) updateData.role = role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'CLIENT';
    if (planId !== undefined) {
      updateData.planId = planId && planId !== 'none' ? planId : null;
    }

    if (username && username !== existingUser.username) {
      const cleanUsername = String(username).trim();
      const duplicate = await prisma.user.findUnique({ where: { username: cleanUsername } });
      if (duplicate && duplicate.id !== id) {
        return NextResponse.json({ error: 'El nombre de usuario ya está en uso' }, { status: 400 });
      }
      updateData.username = cleanUsername;
    }

    // Actualizar contraseña solo si se envía una nueva
    if (password && String(password).trim().length > 0) {
      updateData.password = hashPassword(String(password).trim());
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        plan: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;

    // No permitir que el Super Admin se elimine a sí mismo
    if (currentUser.id === id) {
      return NextResponse.json(
        { error: 'No puedes eliminar tu propia cuenta de Super Administrador.' },
        { status: 400 }
      );
    }

    // Desvincular pantallas asignadas antes de eliminar
    await prisma.screen.updateMany({
      where: { userId: id },
      data: { userId: null },
    });

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Error al eliminar usuario' }, { status: 500 });
  }
}
