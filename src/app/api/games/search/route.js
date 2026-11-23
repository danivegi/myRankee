import { queryIGDB, coverUrl } from '@/lib/igdb';
import { translateGenre, translatePlatform } from '@/lib/translations';
import pool from '@/lib/db';
import { optionalUser } from '@/lib/auth';

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

const FIELDS = 'fields id,name,cover.image_id,rating,total_rating,total_rating_count,genres.name,platforms.name,first_release_date';

// ── Sorting ───────────────────────────────────────────────────────────────────
// sort_by: the web sends the lowercased chip label (relevancia, puntuación, recientes, nombre).
// Accents and case are ignored; anything else means relevancia.
const SORTS = ['relevancia', 'puntuacion', 'recientes', 'nombre'];

function parseSort(raw) {
  const key = (raw ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  return SORTS.includes(key) ? key : 'relevancia';
}

// IGDB sort clause per option. Relevance = popularity (total_rating_count) for text matches; for
// filter-only and backlog lists it stays IGDB's `rating` (as before).
const IGDB_SORT = {
  relevancia: 'total_rating_count desc',
  puntuacion: 'total_rating desc',
  recientes:  'first_release_date desc',
  nombre:     'name asc',
};
const LIST_RELEVANCE_SORT = 'rating desc';

// Text and backlog searches rank a bounded candidate set here, with a TOTAL order (ties → IGDB id),
// then page through it: pages never overlap or skip, and `total` is exactly what can be paged.
const MAX_CANDIDATES = 500; // IGDB's max `limit`
const SORT_FIELDS = 'fields id,name,rating,total_rating,total_rating_count,first_release_date';

const byId = (a, b) => a.id - b.id;

/** Descending by a numeric field; games without it go last. */
function descBy(field) {
  return (a, b) => {
    const x = a[field];
    const y = b[field];
    if (x == null || y == null) return (x == null) - (y == null) || byId(a, b);
    return y - x || byId(a, b);
  };
}

const COMPARATORS = {
  relevancia: descBy('total_rating_count'),
  puntuacion: descBy('total_rating'),
  recientes:  descBy('first_release_date'),
  nombre:     (a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'es', { sensitivity: 'base' }) || byId(a, b),
};

function dedupeById(games) {
  const seen = new Set();
  return games.filter((g) => (seen.has(g.id) ? false : seen.add(g.id)));
}

/** One page of an already ordered candidate list, with full game fields (one IGDB request). */
async function pageOf(ordered, page) {
  const total  = ordered.length;
  const offset = (page - 1) * PAGE_SIZE;
  const ids    = ordered.slice(offset, offset + PAGE_SIZE).map((g) => g.id);

  let games = [];
  if (ids.length) {
    const full = await queryIGDB('games', `${FIELDS}; where id = (${ids.join(',')}); limit ${ids.length};`);
    const byIdMap = new Map((full ?? []).map((g) => [g.id, g]));
    games = ids.map((id) => byIdMap.get(id)).filter(Boolean).map(mapGame);
  }
  return { games, total, page, has_more: offset + PAGE_SIZE < total, page_size: PAGE_SIZE };
}

const searchFailed = () =>
  Response.json({ error: 'No se ha podido completar la búsqueda. Inténtalo de nuevo.' }, { status: 502 });

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

/**
 * GET /api/games/search?q=&page=&sort_by=&…filters
 * → { games, total, page, has_more, page_size } — 25 games per page.
 * sort_by: relevancia (default) | puntuacion | recientes | nombre, applied to the whole result set.
 */
export async function GET(request) {
  const { searchParams } = request.nextUrl;
  const q   = searchParams.get('q')?.trim() ?? '';
  const now = Math.floor(Date.now() / 1000);

  const page    = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const offset  = (page - 1) * PAGE_SIZE;
  const sortKey = parseSort(searchParams.get('sort_by'));

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
    return Response.json({ games: [], total: null, page, has_more: false, page_size: PAGE_SIZE });
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

  // Backlog filters need the viewer (a dead token counts as signed out → 401 auth_required).
  const getUserId = async () => (await optionalUser(request))?.id ?? null;

  const backlogIdsOf = async (userId) => {
    const placeholders = backlogStatuses.map((_, i) => `$${i + 2}`).join(',');
    const res = await pool.query(
      `SELECT igdb_game_id FROM backlog WHERE user_id = $1 AND status IN (${placeholders})`,
      [userId, ...backlogStatuses]
    );
    return res.rows.map((r) => r.igdb_game_id);
  };

  try {
    // ── CASE A: backlog filter + NO search text → DB-first ──────────────────
    if (hasBacklogFilter && !hasText) {
      const userId = await getUserId();
      if (!userId) {
        return Response.json(
          { error: 'auth_required', message: 'Inicia sesión para filtrar por backlog' },
          { status: 401 }
        );
      }

      const backlogIds = (await backlogIdsOf(userId)).slice(0, MAX_CANDIDATES);
      if (backlogIds.length === 0) {
        return Response.json({ games: [], total: 0, page, has_more: false, page_size: PAGE_SIZE });
      }

      const whereStr   = [...baseClauses, `id = (${backlogIds.join(',')})`].join(' & ');
      const candidates = (await queryIGDB('games', `${SORT_FIELDS}; where ${whereStr}; limit ${MAX_CANDIDATES};`)) ?? [];
      const compare    = sortKey === 'relevancia' ? descBy('rating') : COMPARATORS[sortKey];
      return Response.json(await pageOf([...candidates].sort(compare), page));
    }

    // ── CASE B: text search ─────────────────────────────────────────────────
    // Two IGDB queries make the candidate set:
    //   name ~ *"..."*  case-insensitive substring (up to 500, best first by the chosen sort);
    //   search "..."    IGDB full-text index: normalises punctuation, so "repo" finds "R.E.P.O."
    //                   (25, in IGDB's relevance order).
    // Relevance keeps the full-text matches first (as before), then the other substring matches by
    // popularity; the other sorts order the whole union. The backlog filter applies to the whole set.
    if (hasText) {
      const safeQ    = q.replace(/[*"\\]/g, '');
      const whereStr = [`name ~ *"${safeQ}"*`, ...baseClauses].join(' & ');

      const [substringRes, nativeRes] = await Promise.allSettled([
        queryIGDB('games', `${SORT_FIELDS}; where ${whereStr}; sort ${IGDB_SORT[sortKey]}; limit ${MAX_CANDIDATES};`),
        queryIGDB('games', `search "${safeQ}"; ${SORT_FIELDS}; where ${baseClauses.join(' & ')}; limit ${PAGE_SIZE};`),
      ]);
      if (substringRes.status === 'rejected' && nativeRes.status === 'rejected') return searchFailed();

      const substringGames = substringRes.status === 'fulfilled' ? dedupeById(substringRes.value ?? []) : [];
      const nativeGames    = nativeRes.status    === 'fulfilled' ? dedupeById(nativeRes.value ?? []) : [];

      let candidates;
      if (sortKey === 'relevancia') {
        const nativeIds = new Set(nativeGames.map((g) => g.id));
        candidates = [
          ...nativeGames,
          ...substringGames.filter((g) => !nativeIds.has(g.id)).sort(COMPARATORS.relevancia),
        ];
      } else {
        candidates = dedupeById([...nativeGames, ...substringGames]).sort(COMPARATORS[sortKey]);
      }

      if (hasBacklogFilter) {
        const userId = await getUserId();
        if (userId) {
          const inBacklog = new Set(await backlogIdsOf(userId));
          candidates = candidates.filter((g) => inBacklog.has(g.id));
        }
      }

      return Response.json(await pageOf(candidates, page));
    }

    // ── CASE C: filter-only, no text ────────────────────────────────────────
    // Can match thousands of games: IGDB sorts and pages it (offset); `total` from games/count.
    const whereStr = baseClauses.join(' & ');
    const igdbSort = sortKey === 'relevancia' ? LIST_RELEVANCE_SORT : IGDB_SORT[sortKey];
    const [resultsRes, countRes] = await Promise.allSettled([
      queryIGDB('games', `${FIELDS}; where ${whereStr}; sort ${igdbSort}; limit ${PAGE_SIZE}; offset ${offset};`),
      queryIGDB('games/count', `where ${whereStr};`),
    ]);
    if (resultsRes.status === 'rejected') return searchFailed();

    const games = (resultsRes.value ?? []).map(mapGame);
    const total = countRes.status === 'fulfilled' ? (countRes.value?.count ?? null) : null;
    return Response.json({
      games,
      total,
      page,
      has_more: total != null ? offset + games.length < total : games.length === PAGE_SIZE,
      page_size: PAGE_SIZE,
    });
  } catch (err) {
    console.error('[games/search]', err);
    return searchFailed();
  }
}
