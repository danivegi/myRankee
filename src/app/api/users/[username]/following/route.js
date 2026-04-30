import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { ensureFollowsTable } from '@/lib/init-follows';

function getViewerId(request) {
  const h = request.headers.get('authorization');
  if (!h?.startsWith('Bearer ')) return null;
  try { return jwt.verify(h.slice(7), process.env.JWT_SECRET).id; }
  catch { return null; }
}

export async function GET(request, { params }) {
  const { username } = await params;
  const viewerId = getViewerId(request);

  try {
    await ensureFollowsTable();

    const targetRes = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (!targetRes.rows.length) return Response.json([]);

    const userId = targetRes.rows[0].id;

    const res = await pool.query(
      `SELECT u.username, u.nombre, u.apellido, u.avatar_url, u.bio,
              ${viewerId
                ? 'EXISTS(SELECT 1 FROM follows f2 WHERE f2.follower_id = $2 AND f2.followed_id = u.id)'
                : 'false'
              } AS is_following
       FROM follows f
       JOIN users u ON u.id = f.followed_id
       WHERE f.follower_id = $1
       ORDER BY f.created_at DESC`,
      viewerId ? [userId, viewerId] : [userId]
    );

    return Response.json(res.rows);
  } catch (err) {
    console.error('[following]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
