import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { ensureFollowsTable } from '@/lib/init-follows';
import { createNotification } from '@/lib/init-notifications';
import { checkAndUnlockAchievements } from '@/lib/achievements';
import { checkRateLimit, getIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';

function authPayload(request) {
  const h = request.headers.get('authorization');
  if (!h?.startsWith('Bearer ')) return null;
  try { return jwt.verify(h.slice(7), process.env.JWT_SECRET); }
  catch { return null; }
}

export async function GET(request, { params }) {
  const { username } = await params;
  const payload = authPayload(request);
  if (!payload) return Response.json({ is_following: false });

  await ensureFollowsTable();

  const targetRes = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
  if (!targetRes.rows.length) return Response.json({ error: 'Not found' }, { status: 404 });

  const res = await pool.query(
    'SELECT 1 FROM follows WHERE follower_id = $1 AND followed_id = $2',
    [payload.id, targetRes.rows[0].id]
  );
  return Response.json({ is_following: res.rows.length > 0 });
}

export async function POST(request, { params }) {
  const { username } = await params;
  const payload = authPayload(request);
  if (!payload) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const ip = getIp(request);
  const rl = checkRateLimit(`write:${ip}`, LIMITS.write.limit, LIMITS.write.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfter);

  try {
    await ensureFollowsTable();

    const targetRes = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (!targetRes.rows.length)
      return Response.json({ error: 'Usuario no encontrado' }, { status: 404 });

    const followedId = targetRes.rows[0].id;
    const followerId = payload.id;

    if (followerId === followedId)
      return Response.json({ error: 'No puedes seguirte a ti mismo' }, { status: 400 });

    const existsRes = await pool.query(
      'SELECT id FROM follows WHERE follower_id = $1 AND followed_id = $2',
      [followerId, followedId]
    );

    let following;
    if (existsRes.rows.length) {
      await pool.query(
        'DELETE FROM follows WHERE follower_id = $1 AND followed_id = $2',
        [followerId, followedId]
      );
      following = false;
    } else {
      await pool.query(
        'INSERT INTO follows (follower_id, followed_id) VALUES ($1, $2)',
        [followerId, followedId]
      );
      following = true;
      try {
        await pool.query(
          `INSERT INTO activity (user_id, igdb_game_id, type, metadata)
           VALUES ($1, NULL, 'follow', $2)`,
          [followerId, JSON.stringify({ follower_username: payload.username ?? '', followed_username: username })]
        );
      } catch { /* igdb_game_id may be NOT NULL — non-fatal */ }
      try {
        await createNotification({ userId: followedId, fromUserId: followerId, type: 'follow' });
      } catch { /* non-fatal */ }
      checkAndUnlockAchievements(followedId).catch(() => {});
    }

    const countRes = await pool.query(
      'SELECT COUNT(*)::int AS cnt FROM follows WHERE followed_id = $1',
      [followedId]
    );
    return Response.json({ following, followers_count: countRes.rows[0].cnt });

  } catch (err) {
    console.error('[follow]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
