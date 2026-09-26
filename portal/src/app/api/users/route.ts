import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, hashPassword } from '@/lib/auth';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Acceso denegado. Solo el Super Administrador puede gestionar usuarios.' },
        { status: 403 }
      );
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        planId: true,
        plan: {
          select: {
            id: true,
            name: true,
            slug: true,
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
    const { username, password, name, email, role, planId } = body;

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

    const newUser = await prisma.user.create({
      data: {
        username: cleanUsername,
        password: hashPassword(password),
        name: String(name).trim(),
        email: email ? String(email).trim() : null,
        role: role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'CLIENT',
        planId: planId && planId !== 'none' ? planId : null,
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        plan: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 });
  }
}
