import pool from '@/lib/db';
import { queryIGDB, coverUrl } from '@/lib/igdb';

export async function GET(request, { params }) {
  const { username } = await params;
  const { searchParams } = request.nextUrl;
  const page  = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const limit = 50;
  const offset = (page - 1) * limit;

  const userResult = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
  if (!userResult.rows.length)
    return Response.json({ error: 'Usuario no encontrado' }, { status: 404 });

  const userId = userResult.rows[0].id;

  const [countRes, ratingsRes] = await Promise.all([
    pool.query('SELECT COUNT(*) FROM ratings WHERE user_id = $1', [userId]),
    pool.query(
      `SELECT igdb_game_id, score, created_at FROM ratings
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    ),
  ]);

  const total   = parseInt(countRes.rows[0].count);
  const ratings = ratingsRes.rows;

  if (!ratings.length) return Response.json({ entries: [], total, page, hasMore: false });

  const ids = ratings.map((r) => r.igdb_game_id);
  let gameMap = {};

  try {
    const games = await queryIGDB(
      'games',
      `fields id,name,cover.image_id;
       where id = (${ids.join(',')});
       limit ${ids.length};`
    );
    for (const g of games ?? []) {
      gameMap[g.id] = {
        name:  g.name,
        cover: g.cover?.image_id ? coverUrl(g.cover.image_id, 'cover_big') : null,
      };
    }
  } catch {
    // return without covers
  }

  const entries = ratings.map((r) => ({
    igdb_game_id: r.igdb_game_id,
    score:        parseFloat(r.score),
    created_at:   r.created_at,
    name:         gameMap[r.igdb_game_id]?.name  ?? null,
    cover:        gameMap[r.igdb_game_id]?.cover ?? null,
  }));

  return Response.json({ entries, total, page, hasMore: offset + ratings.length < total });
}
