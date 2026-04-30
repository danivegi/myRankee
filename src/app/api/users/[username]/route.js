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

  await ensureFollowsTable();

  const hasViewer = viewerId !== null;
  const result = await pool.query(
    `SELECT
       u.id, u.nombre, u.apellido, u.username, u.bio, u.avatar_url, u.created_at,
       (SELECT COUNT(*) FROM ratings WHERE user_id = u.id)::int AS total_ratings,
       (SELECT COUNT(*) FROM reviews WHERE user_id = u.id)::int AS total_reviews,
       (SELECT COUNT(*) FROM backlog  WHERE user_id = u.id)::int AS total_backlog,
       (SELECT COUNT(*) FROM follows  WHERE followed_id = u.id)::int AS total_followers,
       (SELECT COUNT(*) FROM follows  WHERE follower_id = u.id)::int AS total_following,
       ${hasViewer
         ? 'EXISTS(SELECT 1 FROM follows WHERE follower_id = $2 AND followed_id = u.id)'
         : 'false'
       } AS is_following
     FROM users u
     WHERE u.username = $1`,
    hasViewer ? [username, viewerId] : [username]
  );

  if (!result.rows.length)
    return Response.json({ error: 'Usuario no encontrado' }, { status: 404 });

  return Response.json({ user: result.rows[0] });
}
