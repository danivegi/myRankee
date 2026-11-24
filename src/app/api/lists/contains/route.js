import { requireUser } from '@/lib/auth';
import pool from '@/lib/db';

/**
 * GET /api/lists/contains?igdb_game_id=X (auth) → { igdb_game_id, list_ids }
 * The ids of the signed-in user's lists (public and private) that include the game, so add-to-list UIs
 * can show checkmarks and toggle add/remove with one request.
 */
export async function GET(request) {
  const session = await requireUser(request);
  if (session.response) return session.response;
  const user = session.user;

  const raw = request.nextUrl.searchParams.get('igdb_game_id') ?? '';
  if (!/^\d{1,10}$/.test(raw)) {
    return Response.json({ error: 'igdb_game_id inválido' }, { status: 400 });
  }
  const gameId = Number(raw);

  const result = await pool.query(
    `SELECT l.id
       FROM lists l
       JOIN list_games lg ON lg.list_id = l.id
      WHERE l.user_id = $1 AND lg.igdb_game_id = $2
      ORDER BY l.id`,
    [user.id, gameId]
  );

  return Response.json({ igdb_game_id: gameId, list_ids: result.rows.map((r) => r.id) });
}
