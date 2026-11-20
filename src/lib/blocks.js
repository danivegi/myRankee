import pool from './db';

/**
 * User blocking.
 *
 * - Interactions are blocked BOTH ways: neither side can follow the other or the other's lists, like
 *   or comment on the other's reviews, and nothing between them creates notifications.
 * - Only the BLOCKER stops seeing the blocked user's reviews, comments, feed activity, lists in the
 *   browse tabs and notifications. Public content is not hidden from the blocked user (it's public
 *   without logging in anyway), and nothing ever tells anyone that they were blocked.
 * - Existing likes and comments stay (aggregates and counts don't change); a removed like is allowed.
 */

let ready = false;

/** Same SQL as the migration run in Supabase (kept here like the other ensure* helpers). */
export async function ensureBlocksTable() {
  if (ready) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_blocks (
        blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (blocker_id, blocked_id),
        CONSTRAINT user_blocks_no_self CHECK (blocker_id <> blocked_id)
      )
    `);
    await pool.query(
      'CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks (blocked_id, blocker_id)'
    );
    ready = true;
  } catch (e) {
    console.error('ensureBlocksTable:', e.message);
  }
}

/**
 * Ids of the users `viewerId` blocked (whose content the viewer doesn't see). Empty for anonymous
 * viewers. Use in SQL as `col <> ALL($n::int[])` (an empty array filters nothing).
 */
export async function blockedIdsFor(viewerId) {
  if (viewerId == null) return [];
  await ensureBlocksTable();
  try {
    const res = await pool.query('SELECT blocked_id FROM user_blocks WHERE blocker_id = $1', [viewerId]);
    return res.rows.map((r) => r.blocked_id);
  } catch {
    return []; // never break a read because of blocks
  }
}

/** Block state between two users: { byA: A blocked B, byB: B blocked A }. */
export async function blockState(a, b) {
  if (a == null || b == null || Number(a) === Number(b)) return { byA: false, byB: false };
  await ensureBlocksTable();
  const res = await pool.query(
    `SELECT blocker_id FROM user_blocks
     WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)`,
    [a, b]
  );
  const blockers = new Set(res.rows.map((r) => Number(r.blocker_id)));
  return { byA: blockers.has(Number(a)), byB: blockers.has(Number(b)) };
}

export async function isBlockedEitherWay(a, b) {
  const { byA, byB } = await blockState(a, b);
  return byA || byB;
}

/**
 * 403 for an interaction between `actorId` and `targetUserId`, or null if allowed.
 * The actor who blocked gets a clear message; the one who was blocked gets a generic one that
 * doesn't say why (never reveal a block).
 */
export async function interactionBlockedResponse(actorId, targetUserId) {
  const { byA: actorBlocked, byB: actorWasBlocked } = await blockState(actorId, targetUserId);
  if (actorBlocked) {
    return Response.json(
      { error: 'Has bloqueado a este usuario. Desbloquéalo para poder interactuar con él.', blocked_by_you: true },
      { status: 403 }
    );
  }
  if (actorWasBlocked) {
    return Response.json({ error: 'No puedes realizar esta acción.' }, { status: 403 });
  }
  return null;
}
