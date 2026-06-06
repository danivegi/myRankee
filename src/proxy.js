import { NextResponse } from 'next/server';

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

  if (!origin || !ALLOWED_ORIGINS.has(origin)) {
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
