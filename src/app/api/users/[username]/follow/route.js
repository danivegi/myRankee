import { optionalUser, requireUser } from '@/lib/auth';
import pool from '@/lib/db';
import { ensureFollowsTable } from '@/lib/init-follows';
import { interactionBlockedResponse } from '@/lib/blocks';
import { createNotification, deleteToggleNotification } from '@/lib/init-notifications';
import { checkAndUnlockAchievements } from '@/lib/achievements';
import { checkRateLimit, rateLimitResponse, LIMITS, writeLimitKey } from '@/lib/rate-limit';

export async function GET(request, { params }) {
  const { username } = await params;
  const payload = await optionalUser(request);
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
  const session = await requireUser(request);
  if (session.response) return session.response;
  const payload = session.user;

  const rl = checkRateLimit(writeLimitKey(request, payload), LIMITS.write.limit, LIMITS.write.windowMs);
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

    // Blocking removed any follow between them: this would be a new follow either way.
    const blocked = await interactionBlockedResponse(followerId, followedId);
    if (blocked) return blocked;

    const existsRes = await pool.query(
      'SELECT id FROM follows WHERE follower_id = $1 AND followed_id = $2',
      [followerId, followedId]
    );

    let following;
    if (existsRes.rows.length) {
      const deleteRes = await pool.query(
        'DELETE FROM follows WHERE follower_id = $1 AND followed_id = $2',
        [followerId, followedId]
      );
      following = false;
      // The follow is gone: so is its notification (only for the request that actually removed it).
      if (deleteRes.rowCount > 0) {
        try {
          await deleteToggleNotification({ userId: followedId, fromUserId: followerId, type: 'follow' });
        } catch { /* non-fatal */ }
      }
    } else {
      // UNIQUE (follower_id, followed_id): if a concurrent request already followed, it's already done.
      const insertRes = await pool.query(
        'INSERT INTO follows (follower_id, followed_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [followerId, followedId]
      );
      following = true;
      // Activity, notification and achievements only for the request that actually created the follow.
      if (insertRes.rowCount > 0) {
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
