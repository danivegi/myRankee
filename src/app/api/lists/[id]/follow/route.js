import { requireUser } from '@/lib/auth';
import pool from '@/lib/db';
import { interactionBlockedResponse } from '@/lib/blocks';
import { createNotification, deleteToggleNotification } from '@/lib/init-notifications';

/**
 * Follow / unfollow a list → { following, followers_count }.
 *   POST   toggles (as before).
 *   DELETE unfollows (idempotent: not following → { following: false, … }).
 * The follow row and the count change in ONE transaction with the list row locked, and the count is
 * recounted from list_followers, so concurrent requests can't make it drift (and an old drift heals).
 */
async function changeFollow(request, params, mode) {
  const { id } = await params;
  const session = await requireUser(request);
  if (session.response) return session.response;
  const user = session.user;

  if (!/^\d+$/.test(String(id))) return Response.json({ error: 'Lista no encontrada' }, { status: 404 });

  const client = await pool.connect();
  let result;
  let list;
  try {
    await client.query('BEGIN');
    const listRes = await client.query(
      'SELECT id, user_id, title, is_public FROM lists WHERE id = $1 FOR UPDATE',
      [id]
    );
    list = listRes.rows[0];
    // Private lists can't be followed (nor detected) by anyone but their owner.
    if (!list || (!list.is_public && Number(list.user_id) !== Number(user.id))) {
      await client.query('ROLLBACK');
      return Response.json({ error: 'Lista no encontrada' }, { status: 404 });
    }

    const existing = await client.query(
      'SELECT 1 FROM list_followers WHERE user_id = $1 AND list_id = $2',
      [user.id, id]
    );
    const wasFollowing = existing.rows.length > 0;
    const follow = mode === 'toggle' ? !wasFollowing : false;

    // Following is blocked between users who blocked each other (unfollowing always works).
    if (follow) {
      const blocked = await interactionBlockedResponse(user.id, list.user_id);
      if (blocked) {
        await client.query('ROLLBACK');
        return blocked;
      }
    }

    let changed = false;
    if (follow && !wasFollowing) {
      const ins = await client.query(
        'INSERT INTO list_followers (user_id, list_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [user.id, id]
      );
      changed = ins.rowCount > 0;
    } else if (!follow && wasFollowing) {
      const del = await client.query(
        'DELETE FROM list_followers WHERE user_id = $1 AND list_id = $2',
        [user.id, id]
      );
      changed = del.rowCount > 0;
    }

    const countRes = await client.query(
      `UPDATE lists SET followers_count = (SELECT COUNT(*)::int FROM list_followers WHERE list_id = $1)
       WHERE id = $1
       RETURNING followers_count`,
      [id]
    );
    await client.query('COMMIT');
    result = { following: follow, followers_count: countRes.rows[0].followers_count, changed };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[lists follow]', err);
    return Response.json({ error: 'No se ha podido actualizar el seguimiento' }, { status: 500 });
  } finally {
    client.release();
  }

  // Notifications only for the request that actually changed something (non-fatal).
  if (result.changed) {
    try {
      if (result.following) {
        await createNotification({
          userId: list.user_id,
          fromUserId: user.id,
          type: 'list_follow',
          entityId: list.id,
          entityName: list.title,
        });
      } else {
        await deleteToggleNotification({
          userId: list.user_id,
          fromUserId: user.id,
          type: 'list_follow',
          entityId: list.id,
        });
      }
    } catch { /* non-fatal */ }
  }

  return Response.json({ following: result.following, followers_count: result.followers_count });
}

export async function POST(request, { params }) {
  return changeFollow(request, params, 'toggle');
}

export async function DELETE(request, { params }) {
  return changeFollow(request, params, 'unfollow');
}
