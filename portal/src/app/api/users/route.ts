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

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Acceso denegado. Solo el Super Administrador puede gestionar usuarios.' },
        { status: 403 }
      );
    }

    const now = new Date();

    // Auto-desactivar clientes cuyo plan haya expirado
    const expiredUsers = await prisma.user.findMany({
      where: {
        role: 'CLIENT',
        isActive: true,
        planEndsAt: { lt: now },
      },
      select: { id: true },
    });

    if (expiredUsers.length > 0) {
      const expiredIds = expiredUsers.map((u) => u.id);
      await prisma.user.updateMany({
        where: { id: { in: expiredIds } },
        data: { isActive: false },
      });

      for (const u of expiredUsers) {
        const screens = await prisma.screen.findMany({
          where: { userId: u.id },
          select: { id: true },
        });
        for (const s of screens) {
          publishSyncEvent(s.id);
        }
      }
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
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
        plan: {
          select: {
            id: true,
            name: true,
            slug: true,
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
        _count: {
          select: {
            screens: true,
          },
        },
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Acceso denegado. Solo el Super Administrador puede crear usuarios.' },
        { status: 403 }
      );
    }

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

    if (!username || !password || !name) {
      return NextResponse.json(
        { error: 'Usuario, contraseña y nombre son obligatorios.' },
        { status: 400 }
      );
    }

    const cleanUsername = String(username).trim();

    // Comprobar si ya existe el usuario
    const existing = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (existing) {
      return NextResponse.json(
        { error: `El usuario "${cleanUsername}" ya existe. Elige otro nombre de usuario.` },
        { status: 400 }
      );
    }

    const parsedStartsAt = parseDateParam(planStartsAt, false);
    const parsedEndsAt = parseDateParam(planEndsAt, true);

    const now = new Date();
    // Si el plan ya está vencido, forzar automáticamente isActive a false
    const computedIsActive = (parsedEndsAt && parsedEndsAt < now)
      ? false
      : (typeof isActive === 'boolean' ? isActive : true);

    const newUser = await prisma.user.create({
      data: {
        username: cleanUsername,
        password: hashPassword(password),
        name: String(name).trim(),
        email: email ? String(email).trim() : null,
        role: role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'CLIENT',
        isActive: computedIsActive,
        planStartsAt: parsedStartsAt,
        planEndsAt: parsedEndsAt,
        planId: planId && planId !== 'none' ? planId : null,
      },
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

    // Si se enviaron pantallas a asignar inicialmente
    if (Array.isArray(screenIds) && screenIds.length > 0) {
      await prisma.screen.updateMany({
        where: { id: { in: screenIds } },
        data: { userId: newUser.id },
      });
    }

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 });
  }
}
