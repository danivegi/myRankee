import { requireUser } from '@/lib/auth';
import pool from '@/lib/db';

export async function DELETE(request, { params }) {
  const session = await requireUser(request);
  if (session.response) return session.response;
  const userId = session.user.id;

  const { position } = await params;

  await pool.query(
    'DELETE FROM favorite_games_top WHERE user_id = $1 AND position = $2',
    [userId, parseInt(position)]
  );

  return Response.json({ ok: true });
}
