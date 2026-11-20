import { optionalUser } from '@/lib/auth';
import pool from '@/lib/db';

export async function GET(request, { params }) {
  // Signed out (or a dead token): not favorited, like before.
  const viewer = await optionalUser(request);
  if (!viewer) return Response.json({ favorited: false });
  const userId = viewer.id;

  const { igdb_game_id } = await params;

  const result = await pool.query(
    'SELECT 1 FROM favorite_games WHERE user_id = $1 AND igdb_game_id = $2',
    [userId, parseInt(igdb_game_id)]
  );

  return Response.json({ favorited: result.rows.length > 0 });
}
