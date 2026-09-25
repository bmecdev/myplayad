import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('myplayad_session');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error en /api/auth/logout:', error);
    return NextResponse.json(
      { error: 'Error cerrando la sesión' },
      { status: 500 }
    );
  }
}

