import { bumpTokenVersion, requireUser, signToken } from '@/lib/auth';
import { getIp, checkRateLimit, rateLimitResponse, writeLimitKey } from '@/lib/rate-limit';
import { logSecurityEvent } from '@/lib/init-auth';

// Signing out everywhere is rare: 10 per user per hour.
const LOGOUT_ALL_LIMIT = { limit: 10, windowMs: 60 * 60 * 1000 };

/**
 * "Cerrar sesión en todos los dispositivos": every existing token stops working (token_version + 1)
 * and this device gets a new one, so it stays signed in. → { message, token }
 */
export async function POST(request) {
  const session = await requireUser(request);
  if (session.response) return session.response;
  const user = session.user;

  const rl = checkRateLimit(`logout-all:${writeLimitKey(request, user)}`, LOGOUT_ALL_LIMIT.limit, LOGOUT_ALL_LIMIT.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfter);

  const tokenVersion = await bumpTokenVersion(user.id);
  logSecurityEvent({ userId: user.id, eventType: 'logout_all', ip: getIp(request) });

  return Response.json({
    message: 'Se ha cerrado la sesión en todos los demás dispositivos.',
    token: signToken({ id: user.id, token_version: tokenVersion }),
  });
}
