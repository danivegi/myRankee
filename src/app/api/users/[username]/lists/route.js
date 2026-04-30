import pool from '@/lib/db';
import { queryIGDB, coverUrl } from '@/lib/igdb';

export async function GET(request, { params }) {
  const { username } = await params;

  const userResult = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
  if (!userResult.rows.length) {
    return Response.json({ error: 'Usuario no encontrado' }, { status: 404 });
  }

  const userId = userResult.rows[0].id;

  const result = await pool.query(
    `SELECT l.id, l.title, l.description, l.followers_count, l.created_at,
            COUNT(lg.id)::int AS games_count,
            ARRAY(
              SELECT lg2.igdb_game_id FROM list_games lg2
              WHERE lg2.list_id = l.id
              ORDER BY lg2.added_at ASC
              LIMIT 4
            ) AS cover_game_ids
     FROM lists l
     LEFT JOIN list_games lg ON lg.list_id = l.id
     WHERE l.user_id = $1 AND l.is_public = true
     GROUP BY l.id
     ORDER BY l.created_at DESC`,
    [userId]
  );

  const lists = await Promise.all(
    result.rows.map(async (list) => {
      const gameIds = list.cover_game_ids || [];
      let covers = [];

      if (gameIds.length > 0) {
        try {
          const games = await queryIGDB(
            'games',
            `fields id,cover.image_id;
             where id = (${gameIds.join(',')});
             limit 4;`
          );
          covers = games
            .filter((g) => g.cover?.image_id)
            .map((g) => coverUrl(g.cover.image_id, 'cover_big'));
        } catch {
          // covers stays empty
        }
      }

      return { ...list, covers };
    })
  );

  return Response.json(lists);
}
