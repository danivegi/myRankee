import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { queryIGDB, coverUrl } from '@/lib/igdb';

export async function GET(request, { params }) {
  const { username } = await params;

  const userResult = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
  if (!userResult.rows.length) {
    return Response.json({ error: 'Usuario no encontrado' }, { status: 404 });
  }

  const userId = userResult.rows[0].id;

  // If the viewer is the owner, include private lists too
  let viewerUserId = null;
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
      viewerUserId = decoded.id;
    } catch {}
  }
  const isOwner = viewerUserId === userId;

  const result = await pool.query(
    `SELECT l.id, l.title, l.description, l.is_public, l.followers_count, l.created_at,
            u.username, u.nombre, u.apellido, u.avatar_url,
            COUNT(lg.id)::int AS games_count,
            ARRAY(
              SELECT lg2.igdb_game_id FROM list_games lg2
              WHERE lg2.list_id = l.id
              ORDER BY lg2.added_at ASC
              LIMIT 4
            ) AS cover_game_ids
     FROM lists l
     JOIN users u ON u.id = l.user_id
     LEFT JOIN list_games lg ON lg.list_id = l.id
     WHERE l.user_id = $1${isOwner ? '' : ' AND l.is_public = true'}
     GROUP BY l.id, u.username, u.nombre, u.apellido, u.avatar_url
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

      return {
        id:              list.id,
        title:           list.title,
        description:     list.description,
        is_public:       list.is_public,
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
