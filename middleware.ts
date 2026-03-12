import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { isAllowedOrigin } from '@/lib/security/csrf';

function isStateChangingMethod(method: string) {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Content-Security-Policy', "default-src 'self'; img-src 'self' https: data:; script-src 'self' 'unsafe-inline' https://js.stripe.com; style-src 'self' 'unsafe-inline'; connect-src 'self' https:;");

  if (request.nextUrl.pathname.startsWith('/api') && isStateChangingMethod(request.method)) {
    if (request.nextUrl.pathname.startsWith('/api/webhooks/')) {
      return response;
    }

    const origin = request.headers.get('origin');
    const host = request.headers.get('host');

    if (!isAllowedOrigin(origin, host)) {
      return NextResponse.json({ error: 'CSRF blocked' }, { status: 403 });
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
