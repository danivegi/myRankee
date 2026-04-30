import pool from '@/lib/db';
import { queryIGDB, coverUrl } from '@/lib/igdb';
import { translateGenre } from '@/lib/translations';

export async function GET() {
  let featuredId = null;
  let avgScore = null;
  let totalRatings = null;

  // ── Step 1: community pick — best-rated game this week (≥2 ratings) ──────────
  try {
    const res = await pool.query(`
      SELECT igdb_game_id,
             ROUND(AVG(score)::numeric, 1) AS avg_score,
             COUNT(*)::int                 AS total
      FROM ratings
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY igdb_game_id
      HAVING COUNT(*) >= 2
      ORDER BY AVG(score) DESC, COUNT(*) DESC
      LIMIT 1
    `);
    if (res.rows.length) {
      featuredId   = res.rows[0].igdb_game_id;
      avgScore     = parseFloat(res.rows[0].avg_score);
      totalRatings = res.rows[0].total;
    }
  } catch { /* fall through to IGDB pool */ }

  // ── Step 2: IGDB fallback — random pick from top-20 recent games ─────────────
  // Seed by day so the result is stable within a 24-hour window but rotates daily.
  if (!featuredId) {
    const now         = Math.floor(Date.now() / 1000);
    const twoYearsAgo = now - 2 * 365 * 86400;

    try {
      const pool20 = await queryIGDB('games', `
        fields id;
        where cover != null
          & screenshots != null
          & rating > 85
          & rating_count > 200
          & first_release_date > ${twoYearsAgo}
          & first_release_date < ${now}
          & version_parent = null;
        sort rating desc;
        limit 20;
      `);

      if (pool20?.length) {
        const dayIndex = Math.floor(Date.now() / 86_400_000) % pool20.length;
        featuredId = pool20[dayIndex].id;

        // Attach community stats for this game if any exist
        try {
          const statsRes = await pool.query(
            `SELECT ROUND(AVG(score)::numeric, 1) AS avg_score, COUNT(*)::int AS total
             FROM ratings WHERE igdb_game_id = $1`,
            [featuredId]
          );
          if (statsRes.rows[0].total > 0) {
            avgScore     = parseFloat(statsRes.rows[0].avg_score);
            totalRatings = statsRes.rows[0].total;
          }
        } catch { /* non-fatal */ }
      }
    } catch { /* ignore */ }
  }

  if (!featuredId) return Response.json({ error: 'No featured game found' }, { status: 404 });

  // ── Step 3: fetch full game details from IGDB ─────────────────────────────────
  try {
    const games = await queryIGDB('games', `
      fields id,name,cover.image_id,screenshots.image_id,summary,genres.name;
      where id = ${featuredId};
      limit 1;
    `);
    if (!games?.length) return Response.json({ error: 'Game not found' }, { status: 404 });

    const g = games[0];
    return Response.json(
      {
        id:            g.id,
        name:          g.name,
        cover:         coverUrl(g.cover?.image_id, 'cover_big_2x'),
        screenshots:   (g.screenshots ?? []).slice(0, 3).map(s => coverUrl(s.image_id, 'screenshot_big')),
        summary:       g.summary ?? null,
        genres:        g.genres?.map(gn => translateGenre(gn.name)) ?? [],
        average_score: avgScore,
        total_ratings: totalRatings,
      },
      { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600' } }
    );
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
