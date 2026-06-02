import { queryIGDB, coverUrl } from '@/lib/igdb';
import { translateGenre, translatePlatform } from '@/lib/translations';
import pool from '@/lib/db';
import jwt from 'jsonwebtoken';

const PAGE_SIZE = 25;

const PLATFORM_IDS = {
  'PlayStation 5':      167,
  'PlayStation 4':       48,
  'PlayStation 3':        9,
  'PlayStation 2':        8,
  'PlayStation':          7,
  'PS Vita':             46,
  'PSP':                 38,
  'Xbox Series X|S':    169,
  'Xbox One':            49,
  'Xbox 360':            12,
  'Xbox':                11,
  'Nintendo Switch':    130,
  'Wii U':               41,
  'Wii':                  5,
  'GameCube':            21,
  'Nintendo 64':          4,
  'SNES':                19,
  'NES':                 18,
  'Nintendo 3DS':        37,
  'Nintendo DS':         20,
  'Game Boy Advance':    24,
  'Game Boy Color':      22,
  'Game Boy':            33,
  'PC':                  [6, 14, 3, 13],  // Win, Mac, Linux, DOS
  'Dreamcast':           23,
  'Saturn':              32,
  'Mega Drive':          29,
  'Android':             34,
  'iOS':                 39,
};

const GENRE_CONDITIONS = {
  'RPG':        'genres = (12)',
  'Acción':     '(genres = (4) | genres = (5) | genres = (25))',
  'Aventura':   'genres = (31)',
  'Estrategia': '(genres = (11) | genres = (15) | genres = (16))',
  'Indie':      'genres = (32)',
  'Deportes':   'genres = (14)',
  'Terror':     'themes = (19)',
};

const RATING_THRESHOLD = { '5': 90, '4': 80, '3': 60, '2': 40, '1': 20 };

const FIELDS = 'fields id,name,cover.image_id,rating,genres.name,platforms.name,first_release_date';

function mapGame(g) {
  return {
    id: g.id,
    name: g.name,
    cover: coverUrl(g.cover?.image_id, 'cover_big'),
    genres: g.genres?.map((gen) => translateGenre(gen.name)) ?? [],
    platforms: g.platforms?.map((p) => translatePlatform(p.name)) ?? [],
    year: g.first_release_date ? new Date(g.first_release_date * 1000).getFullYear() : null,
  };
}

export async function GET(request) {
  const { searchParams } = request.nextUrl;
  const q   = searchParams.get('q')?.trim() ?? '';
  const now = Math.floor(Date.now() / 1000);

  const page   = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const offset = (page - 1) * PAGE_SIZE;

  // ── Parse filter params ────────────────────────────────────────────────────
  const selectedPlatforms = searchParams.get('platforms')?.split(',').filter(Boolean) ?? [];
  const platformIds = selectedPlatforms.flatMap((n) => {
    const v = PLATFORM_IDS[n];
    return Array.isArray(v) ? v : v ? [v] : [];
  });

  const selectedGenres    = searchParams.get('genres')?.split(',').filter(Boolean) ?? [];
  const genreConditions   = selectedGenres.map((g) => GENRE_CONDITIONS[g]).filter(Boolean);

  const yearFrom      = parseInt(searchParams.get('year_from'));
  const yearTo        = parseInt(searchParams.get('year_to'));
  const minRating     = searchParams.get('min_rating');
  const ratingThreshold = minRating ? RATING_THRESHOLD[minRating] : null;
  const companyIds    = searchParams.get('company_ids')?.split(',').map(Number).filter(Boolean) ?? [];

  const backlogStatuses  = searchParams.get('backlog_status')?.split(',').filter(Boolean) ?? [];
  const hasBacklogFilter = backlogStatuses.length > 0;
  const hasText          = q.length > 0;
  const hasIGDBFilters   = platformIds.length > 0 || genreConditions.length > 0 ||
    !isNaN(yearFrom) || !isNaN(yearTo) || !!ratingThreshold || companyIds.length > 0;

  if (!hasText && !hasIGDBFilters && !hasBacklogFilter) {
    return Response.json({ games: [], total: null, page });
  }

  // ── Build shared IGDB where clauses ───────────────────────────────────────
  const baseClauses = [
    'first_release_date != null',
    `first_release_date < ${now}`,
    'version_parent = null',
  ];
  if (platformIds.length > 0)     baseClauses.push(`platforms = (${platformIds.join(',')})`);
  if (!isNaN(yearFrom))           baseClauses.push(`first_release_date >= ${Math.floor(new Date(`${yearFrom}-01-01T00:00:00Z`).getTime() / 1000)}`);
  if (!isNaN(yearTo))             baseClauses.push(`first_release_date <= ${Math.floor(new Date(`${yearTo}-12-31T23:59:59Z`).getTime() / 1000)}`);
  if (ratingThreshold)            baseClauses.push(`rating >= ${ratingThreshold}`);
  if (genreConditions.length > 0) baseClauses.push(`(${genreConditions.join(' | ')})`);
  if (companyIds.length === 1)    baseClauses.push(`involved_companies.company = (${companyIds[0]})`);
  else if (companyIds.length > 1) baseClauses.push(`(${companyIds.map((id) => `involved_companies.company = (${id})`).join(' | ')})`);

  function getUserId() {
    const tok = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!tok) return null;
    try { return jwt.verify(tok, process.env.JWT_SECRET).id; } catch { return null; }
  }

  // ── CASE A: backlog filter + NO search text → DB-first ────────────────────
  if (hasBacklogFilter && !hasText) {
    const userId = getUserId();
    if (!userId) {
      return Response.json(
        { error: 'auth_required', message: 'Inicia sesión para filtrar por backlog' },
        { status: 401 }
      );
    }

    const placeholders = backlogStatuses.map((_, i) => `$${i + 2}`).join(',');
    const dbRes = await pool.query(
      `SELECT igdb_game_id FROM backlog WHERE user_id = $1 AND status IN (${placeholders})`,
      [userId, ...backlogStatuses]
    );

    if (dbRes.rows.length === 0) return Response.json({ games: [], total: 0, page });

    const backlogIds = dbRes.rows.map((r) => r.igdb_game_id).slice(0, 500);
    const whereStr   = [...baseClauses, `id = (${backlogIds.join(',')})`].join(' & ');

    const [resultsRes, countRes] = await Promise.allSettled([
      queryIGDB('games', `${FIELDS}; where ${whereStr}; sort rating desc; limit ${PAGE_SIZE}; offset ${offset};`),
      queryIGDB('games/count', `where ${whereStr};`),
    ]);

    return Response.json({
      games: (resultsRes.status === 'fulfilled' ? resultsRes.value ?? [] : []).map(mapGame),
      total: countRes.status  === 'fulfilled'  ? (countRes.value?.count ?? null) : null,
      page,
    });
  }

  // ── CASE B: text search ───────────────────────────────────────────────────
  // IGDB count endpoint doesn't support 'search', so total is unknown for
  // text queries — the frontend falls back to prev/next pagination.
  if (hasText) {
    const whereStr  = baseClauses.join(' & ');
    const igdbQuery = `${FIELDS}; search "${q.replace(/"/g, '')}"; where ${whereStr}; limit ${PAGE_SIZE}; offset ${offset};`;
    const results   = await queryIGDB('games', igdbQuery);
    let games = (results ?? []).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).map(mapGame);

    if (hasBacklogFilter) {
      const userId = getUserId();
      if (userId) {
        const placeholders = backlogStatuses.map((_, i) => `$${i + 2}`).join(',');
        const res = await pool.query(
          `SELECT igdb_game_id FROM backlog WHERE user_id = $1 AND status IN (${placeholders})`,
          [userId, ...backlogStatuses]
        );
        const backlogGameIds = new Set(res.rows.map((r) => r.igdb_game_id));
        games = games.filter((g) => backlogGameIds.has(g.id));
      }
    }

    return Response.json({ games, total: null, page });
  }

  // ── CASE C: filter-only, no text ──────────────────────────────────────────
  const whereStr = baseClauses.join(' & ');
  const [resultsRes, countRes] = await Promise.allSettled([
    queryIGDB('games', `${FIELDS}; where ${whereStr}; sort rating desc; limit ${PAGE_SIZE}; offset ${offset};`),
    queryIGDB('games/count', `where ${whereStr};`),
  ]);

  return Response.json({
    games: (resultsRes.status === 'fulfilled' ? resultsRes.value ?? [] : []).map(mapGame),
    total: countRes.status  === 'fulfilled'  ? (countRes.value?.count ?? null) : null,
    page,
  });
}
