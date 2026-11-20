import { requireUser } from '@/lib/auth';
import pool from '@/lib/db';

export async function DELETE(request, { params }) {
  const session = await requireUser(request);
  if (session.response) return session.response;
  const user = session.user;

  const { id: reviewId, commentId } = await params;

  const commentRes = await pool.query(
    'SELECT id, user_id FROM review_comments WHERE id = $1 AND review_id = $2',
    [commentId, reviewId]
  );
  if (!commentRes.rows.length)
    return Response.json({ error: 'Comentario no encontrado' }, { status: 404 });
  const comment = commentRes.rows[0];

  const reviewRes = await pool.query(
    'SELECT user_id FROM reviews WHERE id = $1',
    [reviewId]
  );
  if (!reviewRes.rows.length)
    return Response.json({ error: 'Reseña no encontrada' }, { status: 404 });
  const review = reviewRes.rows[0];

  if (comment.user_id !== user.id && review.user_id !== user.id)
    return Response.json({ error: 'Sin permisos' }, { status: 403 });

  await pool.query('DELETE FROM review_comments WHERE id = $1', [commentId]);
  await pool.query(
    'UPDATE reviews SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = $1',
    [reviewId]
  );

  return Response.json({ ok: true });
}
