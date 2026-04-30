import { NextResponse } from 'next/server';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
];

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  if (!pathname.startsWith('/api/') || SAFE_METHODS.has(method)) {
    return NextResponse.next();
  }

  const origin = request.headers.get('origin');

  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
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
