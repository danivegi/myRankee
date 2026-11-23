import pool from '@/lib/db';
import { queryIGDB, coverUrl } from '@/lib/igdb';

const VALID_STATUSES = ['jugado', 'jugando', 'pendiente'];
const VALID_SORTS    = ['recent', 'old', 'az', 'za', 'year'];

const byName = (a, b) => a.game.name.localeCompare(b.game.name, 'es', { sensitivity: 'base' });

/**
 * Name and year come from IGDB, so those sorts run here after the merge. Items IGDB couldn't
 * describe (no name / no year) go last; ties keep the date order from the query (newest first).
 */
function sortItems(items, sort) {
  if (sort === 'recent' || sort === 'old') return items;
  const known   = items.filter((i) => (sort === 'year' ? i.game.year != null : !!i.game.name));
  const unknown = items.filter((i) => !known.includes(i));
  if (sort === 'az') known.sort(byName);
  else if (sort === 'za') known.sort((a, b) => byName(b, a));
  else known.sort((a, b) => b.game.year - a.game.year); // year: newest release first
  return [...known, ...unknown];
}

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
    'SELECT id FROM users WHERE lower(username) = lower($1)',
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

  // Date sorts in the DB; name/year after the IGDB merge (sortItems). Ties: newest entry first.
  const dbOrder = sort === 'old' ? 'b.updated_at ASC, b.igdb_game_id ASC' : 'b.updated_at DESC, b.igdb_game_id DESC';

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

  return Response.json({ items: sortItems(items, sort), counts });
}
