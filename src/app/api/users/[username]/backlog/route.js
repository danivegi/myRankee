import pool from '@/lib/db';
import { queryIGDB, coverUrl } from '@/lib/igdb';

const VALID_STATUSES = ['jugado', 'jugando', 'pendiente'];
const VALID_SORTS    = ['recent', 'old', 'az', 'za', 'year'];

export async function GET(request, { params }) {
  const { username } = await params;
  const sp     = request.nextUrl.searchParams;
  const status = sp.get('status');
  const sort   = sp.get('sort') ?? 'recent';

  if (status && !VALID_STATUSES.includes(status))
    return Response.json({ error: 'Estado inválido' }, { status: 400 });
  if (!VALID_SORTS.includes(sort))
    return Response.json({ error: 'Orden inválido' }, { status: 400 });

  // Resolve user
  const userRes = await pool.query(
    'SELECT id FROM users WHERE username = $1',
    [username]
  );
  if (!userRes.rows.length)
    return Response.json({ error: 'Usuario no encontrado' }, { status: 404 });

  const userId = userRes.rows[0].id;

  // Counts for all statuses (always)
  const countsRes = await pool.query(
    `SELECT status, COUNT(*)::int AS count
     FROM backlog WHERE user_id = $1
     GROUP BY status`,
    [userId]
  );
  const counts = { jugado: 0, jugando: 0, pendiente: 0 };
  for (const row of countsRes.rows) counts[row.status] = row.count;

  // Items (optionally filtered by status)
  const qParams = [userId];
  let whereClause = 'WHERE b.user_id = $1';
  if (status) {
    whereClause += ' AND b.status = $2';
    qParams.push(status);
  }

  // DB-level sort only for date-based; name/year sorted client-side after IGDB merge
  const dbOrder = sort === 'old' ? 'b.updated_at ASC' : 'b.updated_at DESC';

  const backlogRes = await pool.query(
    `SELECT b.igdb_game_id, b.status, b.updated_at AS added_at
     FROM backlog b ${whereClause}
     ORDER BY ${dbOrder}`,
    qParams
  );

  const entries = backlogRes.rows;
  if (!entries.length) return Response.json({ items: [], counts });

  // Batch IGDB fetch
  const ids = entries.map((e) => e.igdb_game_id).join(',');
  let gameMap = {};
  try {
    const games = await queryIGDB(
      'games',
      `fields id,name,cover.image_id,first_release_date,genres.name;
       where id = (${ids});
       limit ${Math.min(entries.length, 500)};`
    );
    for (const g of games ?? []) {
      gameMap[g.id] = {
        name:   g.name ?? null,
        cover:  g.cover?.image_id ? coverUrl(g.cover.image_id, 'cover_big') : null,
        year:   g.first_release_date ? new Date(g.first_release_date * 1000).getFullYear() : null,
        genres: g.genres?.map((gen) => gen.name) ?? [],
      };
    }
  } catch {
    // gameMap stays empty — items returned without game metadata
  }

  const items = entries.map((e) => ({
    igdb_game_id: e.igdb_game_id,
    status:       e.status,
    added_at:     e.added_at,
    game:         gameMap[e.igdb_game_id] ?? { name: null, cover: null, year: null, genres: [] },
  }));

  return Response.json({ items, counts });
}
