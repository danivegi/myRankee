export const dynamic   = 'force-dynamic';
export const revalidate = 0;

const ALLOWED_HOSTNAMES = new Set(['images.igdb.com']);

export async function GET(request) {
  const raw = request.nextUrl.searchParams.get('url');
  if (!raw) return new Response('Missing url param', { status: 400 });

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return new Response('Invalid URL', { status: 400 });
  }

  if (!ALLOWED_HOSTNAMES.has(parsed.hostname)) {
    return new Response('Forbidden', { status: 403 });
  }

  let upstream;
  try {
    // cache: 'no-store' prevents Next.js server-side fetch cache from replaying stale responses
    upstream = await fetch(parsed.href, { headers: { Accept: 'image/*' }, cache: 'no-store' });
  } catch (err) {
    console.error('[proxy-image] fetch error:', err.message);
    return new Response('Failed to fetch image', { status: 502 });
  }

  if (!upstream.ok) {
    return new Response('Upstream error', { status: upstream.status });
  }

  const contentType = upstream.headers.get('content-type') ?? 'image/jpeg';
  const body = await upstream.arrayBuffer();

  return new Response(body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
