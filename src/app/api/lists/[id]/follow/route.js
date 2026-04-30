import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { createNotification } from '@/lib/init-notifications';

function getUser(request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(auth.slice(7), process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

export async function POST(request, { params }) {
  const { id } = await params;
  const user = getUser(request);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const listCheck = await pool.query('SELECT id, user_id, title FROM lists WHERE id = $1', [id]);
  if (!listCheck.rows.length) return Response.json({ error: 'Lista no encontrada' }, { status: 404 });
  const list = listCheck.rows[0];

  const existing = await pool.query(
    'SELECT 1 FROM list_followers WHERE user_id = $1 AND list_id = $2',
    [user.id, id]
  );

  if (existing.rows.length > 0) {
    await pool.query(
      'DELETE FROM list_followers WHERE user_id = $1 AND list_id = $2',
      [user.id, id]
    );
    await pool.query(
      'UPDATE lists SET followers_count = GREATEST(0, followers_count - 1) WHERE id = $1',
      [id]
    );
    return Response.json({ following: false });
  } else {
    await pool.query(
      'INSERT INTO list_followers (user_id, list_id) VALUES ($1, $2)',
      [user.id, id]
    );
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
    return Response.json({ following: true });
  }
}
