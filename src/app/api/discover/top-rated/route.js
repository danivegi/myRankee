import pool from '@/lib/db';
import { queryIGDB, coverUrl } from '@/lib/igdb';
import { translateGenre } from '@/lib/translations';

export async function GET() {
  try {
    // ── Step 1: community top-rated ───────────────────────────────────────────
    const res = await pool.query(`
      SELECT igdb_game_id,
             ROUND(AVG(score)::numeric, 1) AS avg_score,
             COUNT(*)::int                 AS total_ratings
      FROM ratings
      GROUP BY igdb_game_id
      HAVING COUNT(*) >= 3
      ORDER BY AVG(score) DESC, COUNT(*) DESC
      LIMIT 10
    `);

    let communityGames = [];
    if (res.rows.length) {
      const ids       = res.rows.map(r => r.igdb_game_id);
      const ratingMap = Object.fromEntries(
        res.rows.map(r => [r.igdb_game_id, {
          avg_score:     parseFloat(r.avg_score),
          total_ratings: r.total_ratings,
        }])
      );

      const games = await queryIGDB('games', `
        fields id,name,cover.image_id,genres.name,first_release_date;
        where id = (${ids.join(',')});
        limit ${ids.length};
      `);

      communityGames = (games ?? [])
        .map(g => ({
          id:            g.id,
          name:          g.name,
          cover:         coverUrl(g.cover?.image_id, 'cover_big'),
          genres:        g.genres?.map(gn => translateGenre(gn.name)) ?? [],
          year:          g.first_release_date ? new Date(g.first_release_date * 1000).getFullYear() : null,
          average_score: ratingMap[g.id]?.avg_score ?? null,
          total_ratings: ratingMap[g.id]?.total_ratings ?? 0,
          source:        'community',
        }))
        .sort((a, b) => (b.average_score ?? 0) - (a.average_score ?? 0));
    }

    // ── Step 2: fill remaining slots with IGDB top-rated ─────────────────────
    const needed = 10 - communityGames.length;
    let igdbFill = [];

    if (needed > 0) {
      const now        = Math.floor(Date.now() / 1000);
      const excludeIds = communityGames.map(g => g.id);
      const excludeClause =
        excludeIds.length > 0 ? `& id != (${excludeIds.join(',')})` : '';

      const igdbResults = await queryIGDB('games', `
        fields id,name,cover.image_id,genres.name,first_release_date,rating;
        where cover != null
          & first_release_date < ${now}
          & version_parent = null
          & rating != null
          & rating_count > 1000
          ${excludeClause};
        sort rating desc;
        limit ${needed};
      `);

      igdbFill = (igdbResults ?? []).map(g => ({
        id:     g.id,
        name:   g.name,
        cover:  coverUrl(g.cover?.image_id, 'cover_big'),
        genres: g.genres?.map(gn => translateGenre(gn.name)) ?? [],
        year:   g.first_release_date ? new Date(g.first_release_date * 1000).getFullYear() : null,
        rating: g.rating ? Math.round(g.rating / 20 * 10) / 10 : null,
        source: 'igdb',
      }));
    }

    return Response.json([...communityGames, ...igdbFill], {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
