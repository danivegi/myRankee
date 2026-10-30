import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { createNotification } from '@/lib/init-notifications';
import { checkAndUnlockAchievements } from '@/lib/achievements';
import { checkRateLimit, rateLimitResponse, LIMITS, writeLimitKey } from '@/lib/rate-limit';

function getUser(request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(auth.slice(7), process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

export async function POST(request, { params }) {
  const user = getUser(request);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const rl = checkRateLimit(writeLimitKey(request, user), LIMITS.write.limit, LIMITS.write.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfter);

  const { id: reviewId } = await params;

  // Check review exists, get owner and game for notifications
  const reviewRes = await pool.query(
    'SELECT id, user_id, igdb_game_id FROM reviews WHERE id = $1',
    [reviewId]
  );
  if (!reviewRes.rows.length)
    return Response.json({ error: 'Reseña no encontrada' }, { status: 404 });
  const review = reviewRes.rows[0];

  // Toggle like
  const existing = await pool.query(
    'SELECT 1 FROM review_likes WHERE user_id = $1 AND review_id = $2',
    [user.id, reviewId]
  );

  let liked;
  if (existing.rows.length) {
    await pool.query(
      'DELETE FROM review_likes WHERE user_id = $1 AND review_id = $2',
      [user.id, reviewId]
    );
    liked = false;
  } else {
    await pool.query(
      'INSERT INTO review_likes (user_id, review_id) VALUES ($1, $2)',
      [user.id, reviewId]
    );
    liked = true;
    try {
      await createNotification({
        userId: review.user_id,
        fromUserId: user.id,
        type: 'like',
        entityId: review.igdb_game_id,
      });
    } catch { /* non-fatal */ }
    checkAndUnlockAchievements(review.user_id).catch(() => {});
  }

  // Count from review_likes directly — no likes_count column needed
  const countRes = await pool.query(
    'SELECT COUNT(*)::int AS likes_count FROM review_likes WHERE review_id = $1',
    [reviewId]
  );

  return Response.json({ liked, likes_count: countRes.rows[0].likes_count });
}
