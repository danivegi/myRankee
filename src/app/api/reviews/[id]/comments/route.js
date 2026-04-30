import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { ensureCommentsTables } from '@/lib/comments';
import { createNotification } from '@/lib/init-notifications';
import { checkRateLimit, getIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';
import { validate, commentSchema, validationErrorResponse } from '@/lib/validation';
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

export async function GET(request, { params }) {
  const { id: reviewId } = await params;

  const ip = getIp(request);
  const rl = checkRateLimit(`read:${ip}`, LIMITS.read.limit, LIMITS.read.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfter);

  await ensureCommentsTables();

  const res = await pool.query(
    `SELECT c.id, c.content, c.created_at,
            u.username, u.nombre, u.avatar_url
     FROM review_comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.review_id = $1
     ORDER BY c.created_at ASC`,
    [reviewId]
  );

  return Response.json(res.rows);
}

export async function POST(request, { params }) {
  const user = getUser(request);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const ip = getIp(request);
  const rl = checkRateLimit(`write:${ip}`, LIMITS.write.limit, LIMITS.write.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfter);

  const { id: reviewId } = await params;

  const body = await request.json();
  const { ok, data, errors } = validate(commentSchema, body);
  if (!ok) return validationErrorResponse(errors);

  const safeContent = sanitizeText(data.content);

  await ensureCommentsTables();

  const reviewRes = await pool.query(
    'SELECT id, user_id, igdb_game_id FROM reviews WHERE id = $1',
    [reviewId]
  );
  if (!reviewRes.rows.length)
    return Response.json({ error: 'Reseña no encontrada' }, { status: 404 });
  const review = reviewRes.rows[0];

  const commentRes = await pool.query(
    `INSERT INTO review_comments (review_id, user_id, content)
     VALUES ($1, $2, $3)
     RETURNING id, content, created_at`,
    [reviewId, user.id, safeContent]
  );
  const comment = commentRes.rows[0];

  await pool.query(
    'UPDATE reviews SET comments_count = comments_count + 1 WHERE id = $1',
    [reviewId]
  );

  const userRow = await pool.query(
    'SELECT username, nombre, avatar_url FROM users WHERE id = $1',
    [user.id]
  );

  if (review.user_id !== user.id) {
    createNotification({
      userId: review.user_id,
      fromUserId: user.id,
      type: 'comment',
      entityId: review.igdb_game_id,
    }).catch(() => {});
  }

  return Response.json({ ...comment, ...userRow.rows[0] }, { status: 201 });
}
