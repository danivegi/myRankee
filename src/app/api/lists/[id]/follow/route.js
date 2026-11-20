import { requireUser } from '@/lib/auth';
import pool from '@/lib/db';
import { interactionBlockedResponse } from '@/lib/blocks';
import { createNotification, deleteToggleNotification } from '@/lib/init-notifications';

export async function POST(request, { params }) {
  const { id } = await params;
  const session = await requireUser(request);
  if (session.response) return session.response;
  const user = session.user;

  if (!/^\d+$/.test(String(id))) return Response.json({ error: 'Lista no encontrada' }, { status: 404 });
  const listCheck = await pool.query('SELECT id, user_id, title, is_public FROM lists WHERE id = $1', [id]);
  if (!listCheck.rows.length) return Response.json({ error: 'Lista no encontrada' }, { status: 404 });
  const list = listCheck.rows[0];
  // Private lists can't be followed (nor detected) by anyone but their owner.
  if (!list.is_public && Number(list.user_id) !== Number(user.id)) return Response.json({ error: 'Lista no encontrada' }, { status: 404 });

  const existing = await pool.query(
    'SELECT 1 FROM list_followers WHERE user_id = $1 AND list_id = $2',
    [user.id, id]
  );

  // Following is blocked between users who blocked each other (unfollowing always works).
  if (!existing.rows.length) {
    const blocked = await interactionBlockedResponse(user.id, list.user_id);
    if (blocked) return blocked;
  }

  // followers_count moves only when a row was actually inserted/deleted, so concurrent
  // toggles can't make it drift from the real number of list_followers rows.
  if (existing.rows.length > 0) {
    const deleteRes = await pool.query(
      'DELETE FROM list_followers WHERE user_id = $1 AND list_id = $2',
      [user.id, id]
    );
    if (deleteRes.rowCount > 0) {
      await pool.query(
        'UPDATE lists SET followers_count = GREATEST(0, followers_count - 1) WHERE id = $1',
        [id]
      );
      // The list follow is gone: so is its notification.
      try {
        await deleteToggleNotification({
          userId: list.user_id,
          fromUserId: user.id,
          type: 'list_follow',
          entityId: list.id,
        });
      } catch { /* non-fatal */ }
    }
    return Response.json({ following: false });
  } else {
    // PK (user_id, list_id): if a concurrent request already followed, it's already done.
    const insertRes = await pool.query(
      'INSERT INTO list_followers (user_id, list_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [user.id, id]
    );
    if (insertRes.rowCount > 0) {
      await pool.query(
        'UPDATE lists SET followers_count = followers_count + 1 WHERE id = $1',
        [id]
      );
      try {
        await createNotification({
          userId: list.user_id,
          fromUserId: user.id,
          type: 'list_follow',
          entityId: list.id,
          entityName: list.title,
        });
      } catch { /* non-fatal */ }
    }
    return Response.json({ following: true });
  }
}
