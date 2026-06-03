import pool from '@/lib/db';
import { queryIGDB, coverUrl } from '@/lib/igdb';
import { translateGenre } from '@/lib/translations';
import { getTranslatedSummary } from '@/lib/game-translations';

function mapGame(g, stats) {
  return {
    id:            g.id,
    name:          g.name,
    cover:         coverUrl(g.cover?.image_id, 'cover_big_2x'),
    screenshots:   (g.screenshots ?? []).slice(0, 3).map(s => coverUrl(s.image_id, 'original')),
    summary:       g.summary ?? null,
    genres:        g.genres?.map(gn => translateGenre(gn.name)) ?? [],
    average_score: stats?.avgScore ?? null,
    total_ratings: stats?.total    ?? null,
  };
}

export async function GET() {
  const now         = Math.floor(Date.now() / 1000);
  const twoYearsAgo = now - 2 * 365 * 86400;

  // ── 1. IGDB trending pool (20 games, full details) ────────────────────────
  let igdbPool = [];
  try {
    igdbPool = await queryIGDB('games', `
      fields id,name,cover.image_id,screenshots.image_id,summary,genres.name;
      where cover != null
        & screenshots != null
        & rating > 85
        & rating_count > 200
        & first_release_date > ${twoYearsAgo}
        & first_release_date < ${now}
        & version_parent = null;
      sort rating desc;
      limit 20;
    `) ?? [];
  } catch { /* non-fatal */ }

  const igdbById = new Map(igdbPool.map(g => [g.id, g]));

  // ── 2. Community: most-rated games (7-day window → 30-day fallback) ───────
  let communityRows = [];
  for (const interval of ['7 days', '30 days']) {
    if (communityRows.length >= 3) break;
    try {
      const res = await pool.query(`
        SELECT igdb_game_id, COUNT(*)::int AS cnt
        FROM   ratings
        WHERE  updated_at > NOW() - INTERVAL '${interval}'
        GROUP  BY igdb_game_id
        ORDER  BY cnt DESC
        LIMIT  6
      `);
      communityRows = res.rows;
    } catch { /* non-fatal */ }
  }

  const communityIds = communityRows.slice(0, 3).map(r => r.igdb_game_id);

  // Fetch IGDB details for community games not already in the pool
  const missingIds = communityIds.filter(id => !igdbById.has(id));
  if (missingIds.length) {
    try {
      const extra = await queryIGDB('games', `
        fields id,name,cover.image_id,screenshots.image_id,summary,genres.name;
        where id = (${missingIds.join(',')});
        limit ${missingIds.length};
      `) ?? [];
      for (const g of extra) igdbById.set(g.id, g);
    } catch { /* non-fatal */ }
  }

  // ── 3. Batch community stats for all candidate games (one query) ──────────
  const candidateIds = [...new Set([...communityIds, ...igdbPool.map(g => g.id)])];
  const statsById    = new Map();
  if (candidateIds.length) {
    try {
      const res = await pool.query(
        `SELECT igdb_game_id,
                ROUND(AVG(score)::numeric, 1) AS avg_score,
                COUNT(*)::int                 AS total
         FROM   ratings
         WHERE  igdb_game_id = ANY($1)
         GROUP  BY igdb_game_id`,
        [candidateIds]
      );
      for (const r of res.rows)
        statsById.set(r.igdb_game_id, { avgScore: parseFloat(r.avg_score), total: r.total });
    } catch { /* non-fatal */ }
  }

  // ── 4. Build interleaved result: IGDB, community, IGDB, community, IGDB, community
  const usedIds = new Set();

  // Community queue (up to 3, deduplicated)
  const communityList = [];
  for (const id of communityIds) {
    if (communityList.length >= 3) break;
    const g = igdbById.get(id);
    if (!g || usedIds.has(id)) continue;
    usedIds.add(id);
    communityList.push(mapGame(g, statsById.get(id)));
  }

  // IGDB queue (up to 6 candidates, excluding community games, rotated daily)
  const dayBase  = Math.floor(Date.now() / 86_400_000);
  const igdbList = [];
  for (let i = 0; igdbList.length < 6 && i < igdbPool.length; i++) {
    const g = igdbPool[(dayBase + i) % igdbPool.length];
    if (usedIds.has(g.id)) continue;
    usedIds.add(g.id);
    igdbList.push(mapGame(g, statsById.get(g.id)));
  }

  // Interleave — IGDB slot falls back to community, community slot falls back to IGDB
  const ig = [...igdbList];
  const cq = [...communityList];
  const result = [];
  for (let pos = 0; pos < 6; pos++) {
    const game = pos % 2 === 0
      ? (ig.shift() ?? cq.shift())
      : (cq.shift() ?? ig.shift());
    if (game) result.push(game);
  }

  if (!result.length)
    return Response.json({ error: 'No featured games found' }, { status: 404 });

  // Translate synopses to Spanish in parallel, falling back to original on failure
  const translations = await Promise.allSettled(
    result.map(g => getTranslatedSummary(g.id, g.summary))
  );
  for (let i = 0; i < result.length; i++) {
    const t = translations[i];
    if (t.status === 'fulfilled' && t.value.text) {
      result[i] = { ...result[i], summary: t.value.text };
    }
  }

  return Response.json(result, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600' },
  });
}
