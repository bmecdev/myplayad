import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const basicAuth = req.headers.get('authorization');
  const url = req.nextUrl;

  // We only protect the admin portal, not API routes that might be needed externally later (if any)
  // For now, protect everything.

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    const [user, pwd] = atob(authValue).split(':');

    // Hardcoded for now. User can change it or use ENV vars.
    if (user === 'admin' && pwd === 'myplayad123') {
      return NextResponse.next();
    }
  }
  url.pathname = '/api/auth';

  return new NextResponse('Auth required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  });
}

export const config = {
  matcher: '/((?!api/public|_next/static|_next/image|favicon.ico).*)',
};
