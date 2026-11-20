import { requireUser } from '@/lib/auth';
import pool from '@/lib/db';
import { ensureBlocksTable } from '@/lib/blocks';

/**
 * The users I blocked, most recent first: [{ username, nombre, apellido, avatar_url, blocked_at }].
 * (Not under /api/users/…: a static segment there would shadow a user with that username.)
 */
export async function GET(request) {
  const session = await requireUser(request);
  if (session.response) return session.response;
  const user = session.user;

  await ensureBlocksTable();
  const res = await pool.query(
    `SELECT u.username, u.nombre, u.apellido, u.avatar_url, b.created_at AS blocked_at
     FROM user_blocks b
     JOIN users u ON u.id = b.blocked_id
     WHERE b.blocker_id = $1
     ORDER BY b.created_at DESC`,
    [user.id]
  );
  return Response.json(res.rows);
}
