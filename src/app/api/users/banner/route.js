import { requireUser } from '@/lib/auth';
import pool from '@/lib/db';
import { checkRateLimit, rateLimitResponse, LIMITS, writeLimitKey } from '@/lib/rate-limit';

const IGDB_IMAGE_RE = /^https:\/\/images\.igdb\.com\/igdb\/image\/upload\/t_[a-z0-9_]+\/[a-z0-9]+\.jpg$/;

export async function PUT(request) {
  const session = await requireUser(request);
  if (session.response) return session.response;
  const user = session.user;

  const rl = checkRateLimit(writeLimitKey(request, user), LIMITS.write.limit, LIMITS.write.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfter);

  const body = await request.json();
  const { banner_url } = body;
  let banner_position = body.banner_position ?? 50;

  if (banner_url !== null && banner_url !== undefined) {
    if (typeof banner_url !== 'string' || !IGDB_IMAGE_RE.test(banner_url)) {
      return Response.json({ error: 'URL de banner no válida' }, { status: 400 });
    }
  }

  // Clamp position to 0–100 integer
  banner_position = Math.max(0, Math.min(100, Math.round(Number(banner_position) || 50)));

  await pool.query(
    'UPDATE users SET banner_url = $1, banner_position = $2 WHERE id = $3',
    [banner_url ?? null, banner_position, user.id]
  );

  return Response.json({ banner_url: banner_url ?? null, banner_position });
}
