import { requireUser } from '@/lib/auth';
import pool from '@/lib/db';

export async function DELETE(request, { params }) {
  const session = await requireUser(request);
  if (session.response) return session.response;
  const userId = session.user.id;

  const { igdb_game_id } = await params;

  await pool.query(
    'DELETE FROM favorite_games WHERE user_id = $1 AND igdb_game_id = $2',
    [userId, parseInt(igdb_game_id)]
  );

  return Response.json({ ok: true });
}
