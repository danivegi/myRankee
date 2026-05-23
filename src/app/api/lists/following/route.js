import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { queryIGDB, coverUrl } from '@/lib/igdb';

export async function GET(request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return Response.json({ error: 'No autenticado' }, { status: 401 });
  }

  let userId;
  try {
    const decoded = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    userId = decoded.id;
  } catch {
    return Response.json({ error: 'Token inválido' }, { status: 401 });
  }

  const result = await pool.query(
    `SELECT l.id, l.title, l.description, l.followers_count, l.created_at,
            u.username, u.nombre, u.apellido, u.avatar_url,
            COUNT(lg.id)::int AS games_count,
            ARRAY(
              SELECT lg2.igdb_game_id FROM list_games lg2
              WHERE lg2.list_id = l.id
              ORDER BY lg2.added_at ASC
              LIMIT 4
            ) AS cover_game_ids,
            lf.created_at AS followed_at
     FROM list_followers lf
     JOIN lists l ON lf.list_id = l.id
     JOIN users u ON l.user_id = u.id
     LEFT JOIN list_games lg ON lg.list_id = l.id
     WHERE lf.user_id = $1
     GROUP BY l.id, u.username, u.nombre, u.apellido, u.avatar_url, lf.created_at
     ORDER BY lf.created_at DESC`,
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
            .map((g) => coverUrl(g.cover.image_id, '720p'));
        } catch {
          // covers stays empty
        }
      }

      return {
        id:              list.id,
        title:           list.title,
        description:     list.description,
        followers_count: list.followers_count,
        games_count:     list.games_count,
        created_at:      list.created_at,
        creator: {
          username:   list.username,
          nombre:     list.nombre,
          apellido:   list.apellido,
          avatar_url: list.avatar_url,
        },
        covers,
      };
    })
  );

  return Response.json(lists);
}
