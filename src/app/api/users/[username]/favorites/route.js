import pool from '@/lib/db';
import { queryIGDB, coverUrl } from '@/lib/igdb';

export async function GET(request, { params }) {
  const { username } = await params;

  const userResult = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
  if (!userResult.rows.length)
    return Response.json({ error: 'Usuario no encontrado' }, { status: 404 });

  const userId = userResult.rows[0].id;

  const result = await pool.query(
    `SELECT igdb_game_id, created_at FROM favorite_games
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  if (!result.rows.length) return Response.json([]);

  const ids = result.rows.map((r) => r.igdb_game_id);
  let gameMap = {};

  try {
    const games = await queryIGDB(
      'games',
      `fields id,name,cover.image_id,first_release_date;
       where id = (${ids.join(',')});
       limit ${ids.length};`
    );
    for (const g of games ?? []) {
      gameMap[g.id] = {
        name:  g.name,
        cover: g.cover?.image_id ? coverUrl(g.cover.image_id, 'cover_big') : null,
        year:  g.first_release_date ? new Date(g.first_release_date * 1000).getFullYear() : null,
      };
    }
  } catch {
    // return favorites without cover data
  }

  const favorites = result.rows.map((r) => ({
    igdb_game_id: r.igdb_game_id,
    created_at:   r.created_at,
    name:         gameMap[r.igdb_game_id]?.name  ?? null,
    cover:        gameMap[r.igdb_game_id]?.cover ?? null,
    year:         gameMap[r.igdb_game_id]?.year  ?? null,
  }));

  return Response.json(favorites);
}
