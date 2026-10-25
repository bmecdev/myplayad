import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, hashPassword } from '@/lib/auth';
import { publishSyncEvent } from '@/lib/mqttPublisher';

// Helper para parsear fechas "YYYY-MM-DD" a UTC estricto sin desviación horaria
function parseDateParam(dateStr?: string | null, isEndOfDay = false): Date | null {
  if (!dateStr) return null;
  const clean = String(dateStr).trim().split('T')[0];
  const parts = clean.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const [year, month, day] = parts;
  if (isEndOfDay) {
    return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  }
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

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
        isActive: true,
        planStartsAt: true,
        planEndsAt: true,
        createdAt: true,
        planId: true,
        plan: true,
        screens: {
          select: {
            id: true,
            name: true,
            location: true,
            consoleId: true,
            lastSeen: true,
            displayState: true,
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
    const {
      username,
      password,
      name,
      email,
      role,
      planId,
      screenIds,
      isActive,
      planStartsAt,
      planEndsAt,
    } = body;

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const updateData: any = {};
    if (name) updateData.name = String(name).trim();
    if (email !== undefined) updateData.email = email ? String(email).trim() : null;
    if (role) updateData.role = role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'CLIENT';
    if (planStartsAt !== undefined) {
      updateData.planStartsAt = parseDateParam(planStartsAt, false);
    }
    if (planEndsAt !== undefined) {
      updateData.planEndsAt = parseDateParam(planEndsAt, true);
    }
    if (planId !== undefined) {
      updateData.planId = planId && planId !== 'none' ? planId : null;
    }

    // Comprobar vigencia del plan
    const targetEndsAt = planEndsAt !== undefined ? updateData.planEndsAt : existingUser.planEndsAt;
    const now = new Date();
    const isPlanExpired = targetEndsAt ? targetEndsAt < now : false;

    if (isActive !== undefined) {
      const requestedActive = Boolean(isActive);
      // Si el plan está vencido y se intenta activar, bloquear con error descriptivo
      if (requestedActive && isPlanExpired && (role || existingUser.role) === 'CLIENT') {
        return NextResponse.json(
          { error: 'No es posible activar un cliente cuyo plan ha vencido. Amplía primero la fecha de vigencia.' },
          { status: 400 }
        );
      }
      // Si se actualizó la fecha del plan a una vigente, asegurar reactivación automática
      if (planEndsAt !== undefined && !isPlanExpired && (role || existingUser.role) === 'CLIENT') {
        updateData.isActive = requestedActive !== false ? true : false;
      } else {
        updateData.isActive = requestedActive;
      }
    } else if (isPlanExpired && (role || existingUser.role) === 'CLIENT') {
      // Si se actualizó la fecha del plan y quedó vencido, desactivar automáticamente al cliente
      updateData.isActive = false;
    } else if (planEndsAt !== undefined && !isPlanExpired && (role || existingUser.role) === 'CLIENT') {
      // Si se amplió la fecha de vigencia y ya no está vencido, activar automáticamente al cliente
      updateData.isActive = true;
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

    // Si se enviaron screenIds, actualizar la asignación de pantallas del cliente
    if (Array.isArray(screenIds)) {
      await prisma.screen.updateMany({
        where: {
          userId: id,
          id: { notIn: screenIds },
        },
        data: { userId: null },
      });

      if (screenIds.length > 0) {
        await prisma.screen.updateMany({
          where: {
            id: { in: screenIds },
          },
          data: { userId: id },
        });
      }
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
        isActive: true,
        planStartsAt: true,
        planEndsAt: true,
        createdAt: true,
        plan: {
          select: {
            id: true,
            name: true,
          },
        },
        screens: {
          select: {
            id: true,
            name: true,
            location: true,
            consoleId: true,
            lastSeen: true,
            displayState: true,
          },
        },
      },
    });

    // Notificar por MQTT a las pantallas vinculadas para que sincronicen en tiempo real su estado
    try {
      const affectedScreens = await prisma.screen.findMany({
        where: { userId: id },
        select: { id: true },
      });
      for (const scr of affectedScreens) {
        publishSyncEvent(scr.id);
      }
    } catch (e) {
      console.warn('Error publicando sync de pantallas para usuario:', e);
    }

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

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // No permitir que el Super Admin se elimine a sí mismo ni eliminar cuentas Super Admin
    if (targetUser.role === 'SUPER_ADMIN' || currentUser.id === id) {
      return NextResponse.json(
        { error: 'No está permitido eliminar cuentas de Super Administrador.' },
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
