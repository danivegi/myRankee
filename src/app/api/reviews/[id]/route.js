import jwt from 'jsonwebtoken';
import pool from '@/lib/db';

function getUser(request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try { return jwt.verify(auth.slice(7), process.env.JWT_SECRET); }
  catch { return null; }
}

export async function DELETE(request, { params }) {
  const user = getUser(request);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { id } = await params;
  const reviewId = parseInt(id, 10);
  if (isNaN(reviewId)) return Response.json({ error: 'ID inválido' }, { status: 400 });

  const check = await pool.query('SELECT user_id FROM reviews WHERE id = $1', [reviewId]);
  if (!check.rows.length) return Response.json({ error: 'Reseña no encontrada' }, { status: 404 });
  if (check.rows[0].user_id !== user.id) return Response.json({ error: 'No autorizado' }, { status: 403 });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query('DELETE FROM review_likes    WHERE review_id = $1', [reviewId]);
    await client.query('DELETE FROM review_comments WHERE review_id = $1', [reviewId]);
    await client.query(
      `DELETE FROM activity WHERE type = 'review' AND user_id = $1 AND (metadata->>'review_id')::int = $2`,
      [user.id, reviewId]
    );
    await client.query('DELETE FROM reviews WHERE id = $1 AND user_id = $2', [reviewId, user.id]);

    await client.query('COMMIT');
    return Response.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[review DELETE]', err);
    return Response.json({ error: 'Error al eliminar la reseña' }, { status: 500 });
  } finally {
    client.release();
  }
}