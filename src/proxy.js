import { NextResponse } from 'next/server';
import { MOBILE_CLIENT_HEADER } from '@/lib/client-header';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Override via ALLOWED_ORIGINS env var (comma-separated) in Vercel for zero-deploy domain changes.
const ALLOWED_ORIGINS = new Set(
  process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
    : [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://myrankee.vercel.app',
        'https://myrankee.com',
        'https://www.myrankee.com',
      ]
);

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  if (!pathname.startsWith('/api/') || SAFE_METHODS.has(method)) {
    return NextResponse.next();
  }

  const origin = request.headers.get('origin');

  // Browsers always send Origin on non-GET requests: it must be one of ours.
  // No Origin means a non-browser client: only the native app is let through.
  const allowed = origin
    ? ALLOWED_ORIGINS.has(origin)
    : request.headers.get(MOBILE_CLIENT_HEADER.name) === MOBILE_CLIENT_HEADER.value;

  if (!allowed) {
    return NextResponse.json(
      { error: 'Solicitud no permitida' },
      { status: 403 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
