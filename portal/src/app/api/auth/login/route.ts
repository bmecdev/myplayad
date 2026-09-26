import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import {
  verifyPassword,
  createSessionToken,
  ensureSuperAdminAndDefaultPlans,
  hashPassword,
} from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Usuario y contraseña son requeridos' },
        { status: 400 }
      );
    }

    // Asegurar que exista el Super Admin y planes por defecto
    await ensureSuperAdminAndDefaultPlans();

    const cleanUsername = String(username).trim();

    // 1. Buscar usuario en base de datos
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: cleanUsername, mode: 'insensitive' } },
          { email: { equals: cleanUsername, mode: 'insensitive' } },
        ],
      },
      include: {
        plan: true,
      },
    });

    const expectedAdminUser = process.env.ADMIN_USER || 'admin';
    const expectedAdminPass = process.env.ADMIN_PASSWORD || 'myplayad123';

    // Si coincide con las credenciales de entorno del Super Admin y aún no está en la BD
    if (!user && cleanUsername.toLowerCase() === expectedAdminUser.toLowerCase()) {
      if (password === expectedAdminPass) {
        user = await prisma.user.upsert({
          where: { username: expectedAdminUser },
          update: {
            password: hashPassword(expectedAdminPass),
            role: 'SUPER_ADMIN',
          },
          create: {
            username: expectedAdminUser,
            password: hashPassword(expectedAdminPass),
            name: 'Super Administrador',
            role: 'SUPER_ADMIN',
          },
          include: { plan: true },
        });
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Credenciales inválidas. Verifica tu usuario y contraseña.' },
        { status: 401 }
      );
    }

    // 2. Verificar contraseña
    const isValid = verifyPassword(password, user.password);
    if (!isValid) {
      // Reintento de sincronización si es el admin de entorno
      if (user.role === 'SUPER_ADMIN' && password === expectedAdminPass) {
        await prisma.user.update({
          where: { id: user.id },
          data: { password: hashPassword(expectedAdminPass) },
        });
      } else {
        return NextResponse.json(
          { error: 'Credenciales inválidas. Verifica tu usuario y contraseña.' },
          { status: 401 }
        );
      }
    }

    // 3. Crear token de sesión
    const token = createSessionToken({
      userId: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      planId: user.planId,
      planName: user.plan?.name || null,
    });

    const cookieStore = await cookies();
    cookieStore.set('myplayad_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 días
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        plan: user.plan ? { id: user.plan.id, name: user.plan.name } : null,
      },
    });
  } catch (error: any) {
    console.error('Error en /api/auth/login:', error);
    return NextResponse.json(
      { 
        error: 'Error procesando la solicitud de inicio de sesión',
        details: error?.message || String(error)
      },
      { status: 500 }
    );
  }
}
