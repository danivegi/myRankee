import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { ensureBlocksTable } from '@/lib/blocks';

function getUser(request) {
  const h = request.headers.get('authorization');
  if (!h?.startsWith('Bearer ')) return null;
  try { return jwt.verify(h.slice(7), process.env.JWT_SECRET); }
  catch { return null; }
}

/**
 * The users I blocked, most recent first: [{ username, nombre, apellido, avatar_url, blocked_at }].
 * (Not under /api/users/…: a static segment there would shadow a user with that username.)
 */
export async function GET(request) {
  const user = getUser(request);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

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
