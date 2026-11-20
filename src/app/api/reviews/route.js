import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { checkAndUnlockAchievements } from '@/lib/achievements';
import { blockedIdsFor } from '@/lib/blocks';
import { ensureCommentsTables } from '@/lib/comments';
import { checkRateLimit, getIp, rateLimitResponse, LIMITS, writeLimitKey } from '@/lib/rate-limit';
import { validate, reviewSchema, validationErrorResponse } from '@/lib/validation';
import { sanitizeText } from '@/lib/sanitize';

function getUser(request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(auth.slice(7), process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

export async function GET(request) {
  const igdb_game_id = request.nextUrl.searchParams.get('igdb_game_id');
  if (!igdb_game_id) return Response.json([], { status: 400 });

  const ip = getIp(request);
  const rl = checkRateLimit(`read:${ip}`, LIMITS.read.limit, LIMITS.read.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfter);

  await ensureCommentsTables();

  const viewer = getUser(request);
  const viewerUserId = viewer?.id ?? null;
  const hidden = await blockedIdsFor(viewerUserId);

  const result = await pool.query(
    `SELECT r.id, r.content, r.created_at,
            u.username, u.nombre, u.apellido, u.avatar_url,
            rat.score,
            COALESCE(lc.like_count, 0)::int AS likes_count,
            COALESCE(r.comments_count, 0)::int AS comments_count,
            COALESCE(r.shares_count, 0)::int  AS shares_count,
            (ul.review_id IS NOT NULL) AS viewer_liked
     FROM reviews r
     JOIN users u ON u.id = r.user_id
     LEFT JOIN ratings rat ON rat.user_id = r.user_id AND rat.igdb_game_id = r.igdb_game_id
     LEFT JOIN (
       SELECT review_id, COUNT(*) AS like_count
       FROM review_likes GROUP BY review_id
     ) lc ON lc.review_id = r.id
     LEFT JOIN review_likes ul ON ul.review_id = r.id AND ul.user_id = $2
     WHERE r.igdb_game_id = $1
       AND r.user_id <> ALL($3::int[])
     ORDER BY r.created_at DESC`,
    [igdb_game_id, viewerUserId, hidden]
  );

  return Response.json(result.rows);
}

export async function POST(request) {
  const user = getUser(request);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const rl = checkRateLimit(writeLimitKey(request, user), LIMITS.write.limit, LIMITS.write.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfter);

  const body = await request.json();
  const { ok, data, errors } = validate(reviewSchema, body);
  if (!ok) return validationErrorResponse(errors);

  const { igdb_game_id, content } = data;
  const safeContent = sanitizeText(content);

  // Atomic upsert on UNIQUE (user_id, igdb_game_id): one review per user and game, even with
  // simultaneous requests. (xmax = 0) is true only for a freshly inserted row.
  const upserted = await pool.query(
    `INSERT INTO reviews (user_id, igdb_game_id, content)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, igdb_game_id)
     DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()
     RETURNING id, content, created_at, (xmax = 0) AS inserted`,
    [user.id, igdb_game_id, safeContent]
  );
  const { inserted, ...review } = upserted.rows[0];

  if (!inserted) {
    pool.query(
      `UPDATE activity SET metadata = $3::jsonb
       WHERE type = 'review' AND user_id = $1 AND (metadata->>'review_id')::int = $2`,
      [user.id, review.id, JSON.stringify({ content: safeContent, review_id: review.id })]
    ).catch(() => {});
  } else {
    pool.query(
      `INSERT INTO activity (user_id, igdb_game_id, type, metadata)
       VALUES ($1, $2, 'review', $3::jsonb)`,
      [user.id, igdb_game_id, JSON.stringify({ content: safeContent, review_id: review.id })]
    ).catch(() => {});
  }

  const userRow = await pool.query(
    'SELECT username, nombre, apellido, avatar_url FROM users WHERE id = $1',
    [user.id]
  );

  const newAchievements = await checkAndUnlockAchievements(user.id);

  return Response.json(
    { ...review, ...userRow.rows[0], new_achievements: newAchievements },
    { status: 201 }
  );
}
