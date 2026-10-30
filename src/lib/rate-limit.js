// Fixed-window in-memory rate limiter.
// Each window resets after `windowMs` ms. Not distributed — fine for
// single-process dev and small deployments. Replace the backing store
// with Upstash Redis (or similar) for multi-instance production.

const windows = new Map();

function cleanup() {
  const now = Date.now();
  for (const [key, entry] of windows.entries()) {
    if (now > entry.resetAt) windows.delete(key);
  }
}

export function checkRateLimit(identifier, limit, windowMs = 60_000) {
  const now = Date.now();

  // Probabilistic cleanup to prevent unbounded memory growth
  if (Math.random() < 0.02) cleanup();

  const entry = windows.get(identifier);

  if (!entry || now > entry.resetAt) {
    windows.set(identifier, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, retryAfter: 0 };
  }

  entry.count++;

  if (entry.count > limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { success: false, remaining: 0, retryAfter };
  }

  return { success: true, remaining: limit - entry.count, retryAfter: 0 };
}

// Pre-defined categories. Pass identifier as `category:ip` or `category:userId`.
export const LIMITS = {
  auth:  { limit: 10,  windowMs: 60_000 },   // 10 req/min  — login, register, etc.
  write: { limit: 30,  windowMs: 60_000 },   // 30 req/min  — POST/PUT/DELETE
  read:  { limit: 100, windowMs: 60_000 },   // 100 req/min — GET
};

export function getIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

// Write-limit key: per user for authenticated requests, so users sharing a
// mobile-carrier IP don't throttle each other; per IP otherwise.
// `user` must come from a verified JWT, never from an unverified decode.
export function writeLimitKey(request, user) {
  return user?.id != null ? `write:user:${user.id}` : `write:${getIp(request)}`;
}

export function rateLimitResponse(retryAfter) {
  return Response.json(
    { error: `Has excedido el límite de peticiones. Inténtalo de nuevo en ${retryAfter} segundos.` },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  );
}
