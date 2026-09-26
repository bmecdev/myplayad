import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rutas públicas que nunca requieren autenticación
  if (
    pathname.startsWith('/api/public') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname === '/api/auth/login'
  ) {
    return NextResponse.next();
  }

  const sessionCookie = req.cookies.get('myplayad_session')?.value;
  let isAuthenticated = false;

  if (sessionCookie) {
    try {
      // 1. Token firmado nuevo
      if (sessionCookie.includes('.')) {
        const [payloadBase64] = sessionCookie.split('.');
        const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
        const jsonStr = atob(base64);
        const payload = JSON.parse(jsonStr);
        if (payload.userId && payload.exp && payload.exp > Date.now()) {
          isAuthenticated = true;
        }
      } else {
        // 2. Fallback token legacy
        const expectedUser = process.env.ADMIN_USER || 'admin';
        const expectedPass = process.env.ADMIN_PASSWORD || 'myplayad123';
        const validToken = btoa(`${expectedUser}:${expectedPass}`);
        if (sessionCookie === validToken) {
          isAuthenticated = true;
        }
      }
    } catch {
      isAuthenticated = false;
    }
  }

  // Si el usuario ya está autenticado y visita /login, redirigir al Dashboard
  if (pathname === '/login') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  // Si no está autenticado:
  if (!isAuthenticated) {
    // Si es una petición a la API, responder con 401 JSON
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'No autorizado. Inicia sesión en el portal.' },
        { status: 401 }
      );
    }

    // Si es una página web, redirigir a la página de login
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/public|_next/static|_next/image|favicon.ico).*)'],
};
