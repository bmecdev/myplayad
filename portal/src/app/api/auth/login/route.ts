import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = body;

    const expectedUser = process.env.ADMIN_USER || 'admin';
    const expectedPass = process.env.ADMIN_PASSWORD || 'myplayad123';

    if (username === expectedUser && password === expectedPass) {
      const sessionToken = Buffer.from(`${expectedUser}:${expectedPass}`).toString('base64');
      
      const cookieStore = await cookies();
      cookieStore.set('myplayad_session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 días de sesión
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Credenciales inválidas. Verifica tu usuario y contraseña.' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Error en /api/auth/login:', error);
    return NextResponse.json(
      { error: 'Error procesando la solicitud de inicio de sesión' },
      { status: 500 }
    );
  }
}

