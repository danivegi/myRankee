import { requireUser } from '@/lib/auth';
import pool from '@/lib/db';
import { ensureBlocksTable } from '@/lib/blocks';
import { checkRateLimit, rateLimitResponse, writeLimitKey } from '@/lib/rate-limit';

// Blocking rewrites follows and notifications: 30 block/unblock requests per user per hour.
const BLOCK_LIMIT = { limit: 30, windowMs: 60 * 60 * 1000 };

async function resolve(request, params) {
  const session = await requireUser(request);
  if (session.response) return { error: session.response };
  const user = session.user;

  const rl = checkRateLimit(`block:${writeLimitKey(request, user)}`, BLOCK_LIMIT.limit, BLOCK_LIMIT.windowMs);
  if (!rl.success) return { error: rateLimitResponse(rl.retryAfter) };

  const { username } = await params;
  const target = await pool.query('SELECT id FROM users WHERE lower(username) = lower($1)', [username]);
  if (!target.rows.length) return { error: Response.json({ error: 'Usuario no encontrado' }, { status: 404 }) };

  const me = Number(user.id);
  const them = Number(target.rows[0].id);
  if (me === them) return { error: Response.json({ error: 'No puedes bloquearte a ti mismo' }, { status: 400 }) };

  await ensureBlocksTable();
  return { me, them };
}

/**
 * Block @username. Idempotent. In one transaction:
 * - follows between both users are removed (follower counts are computed, so they stay right),
 *   with the "follow" notification of each removed follow (like an unfollow);
 * - follows of each other's lists are removed, lowering each list's followers_count by the rows
 *   actually deleted, with their "list_follow" notifications;
 * - the blocker's notifications from the blocked user are deleted.
 * The blocked user isn't told anything.
 */
export async function POST(request, { params }) {
  const r = await resolve(request, params);
  if (r.error) return r.error;
  const { me, them } = r;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      'INSERT INTO user_blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [me, them]
    );

    // Follows both ways, and the notification each one created for the followed user.
    const unfollowed = await client.query(
      `DELETE FROM follows
       WHERE (follower_id = $1 AND followed_id = $2) OR (follower_id = $2 AND followed_id = $1)
       RETURNING follower_id, followed_id`,
      [me, them]
    );
    for (const f of unfollowed.rows) {
      await client.query(
        `DELETE FROM notifications WHERE user_id = $1 AND from_user_id = $2 AND type = 'follow'`,
        [f.followed_id, f.follower_id]
      );
    }

    // List follows both ways (A following B's lists and B following A's lists).
    const listUnfollows = await client.query(
      `DELETE FROM list_followers lf
       USING lists l
       WHERE lf.list_id = l.id
         AND ((lf.user_id = $1 AND l.user_id = $2) OR (lf.user_id = $2 AND l.user_id = $1))
       RETURNING lf.list_id, lf.user_id AS follower_id, l.user_id AS owner_id`,
      [me, them]
    );
    const perList = new Map();
    for (const row of listUnfollows.rows) perList.set(row.list_id, (perList.get(row.list_id) ?? 0) + 1);
    for (const [listId, n] of perList) {
      await client.query(
        'UPDATE lists SET followers_count = GREATEST(0, followers_count - $1) WHERE id = $2',
        [n, listId]
      );
    }
    for (const row of listUnfollows.rows) {
      await client.query(
        `DELETE FROM notifications
         WHERE user_id = $1 AND from_user_id = $2 AND type = 'list_follow' AND entity_id = $3`,
        [row.owner_id, row.follower_id, row.list_id]
      );
    }

    // Whatever the blocked user generated for the blocker is gone.
    await client.query('DELETE FROM notifications WHERE user_id = $1 AND from_user_id = $2', [me, them]);

    await client.query('COMMIT');
    return Response.json({ blocked: true });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[block POST]', err);
    return Response.json({ error: 'No se ha podido bloquear al usuario. Inténtalo de nuevo.' }, { status: 500 });
  } finally {
    client.release();
  }
}

/** Unblock @username. Idempotent. Nothing removed by the block comes back. */
export async function DELETE(request, { params }) {
  const r = await resolve(request, params);
  if (r.error) return r.error;
  await pool.query('DELETE FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2', [r.me, r.them]);
  return Response.json({ blocked: false });
}
