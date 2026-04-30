import pool from '@/lib/db';
import { queryIGDB, coverUrl } from '@/lib/igdb';
import { translateGenre } from '@/lib/translations';

const GENRE_IDS = {
  rpg:         12,
  indie:       32,
  accion:      25,
  shooter:      5,
  aventura:    31,
  plataformas:  8,
  lucha:        4,
  carreras:    10,
  estrategia:  15,
  deportes:    14,
};

function shapeIGDB(g) {
  return {
    id:     g.id,
    name:   g.name,
    cover:  coverUrl(g.cover?.image_id, 'cover_big'),
    genres: g.genres?.map(gn => translateGenre(gn.name)) ?? [],
    year:   g.first_release_date ? new Date(g.first_release_date * 1000).getFullYear() : null,
  };
}

export async function GET(request, { params }) {
  const { genre } = await params;
  const genreId = GENRE_IDS[genre.toLowerCase()];
  if (!genreId) return Response.json({ error: 'Género no encontrado' }, { status: 404 });

  const now = Math.floor(Date.now() / 1000);

  try {
    // ── Step 1: community-rated games for this genre ───────────────────────────
    // Fetch top community-rated IDs (cap at 200 to keep the IGDB where-clause small)
    const communityRes = await pool.query(`
      SELECT igdb_game_id,
             ROUND(AVG(score)::numeric, 1) AS avg_score,
             COUNT(*)::int                 AS total_ratings
      FROM ratings
      GROUP BY igdb_game_id
      HAVING COUNT(*) >= 3
      ORDER BY AVG(score) DESC, COUNT(*) DESC
      LIMIT 200
    `);

    const communityMap = Object.fromEntries(
      communityRes.rows.map(r => [
        r.igdb_game_id,
        { avg_score: parseFloat(r.avg_score), total_ratings: r.total_ratings },
      ])
    );
    const communityIds = communityRes.rows.map(r => r.igdb_game_id);

    let communityGames = [];
    if (communityIds.length > 0) {
      const igdbCommunity = await queryIGDB('games', `
        fields id,name,cover.image_id,genres.name,first_release_date;
        where id = (${communityIds.join(',')})
          & genres = (${genreId})
          & cover != null;
        limit ${Math.min(communityIds.length, 500)};
      `);

      communityGames = (igdbCommunity ?? [])
        .map(g => ({
          ...shapeIGDB(g),
          average_score: communityMap[g.id]?.avg_score ?? null,
          total_ratings: communityMap[g.id]?.total_ratings ?? 0,
          source: 'community',
        }))
        .sort((a, b) => (b.average_score ?? 0) - (a.average_score ?? 0))
        .slice(0, 10);
    }

    // ── Step 2: fill remaining slots with IGDB top-rated ──────────────────────
    const needed = 10 - communityGames.length;
    let igdbFill = [];

    if (needed > 0) {
      const excludeIds = communityGames.map(g => g.id);
      const excludeClause =
        excludeIds.length > 0 ? `& id != (${excludeIds.join(',')})` : '';

      const igdbResults = await queryIGDB('games', `
        fields id,name,cover.image_id,genres.name,first_release_date,rating;
        where cover != null
          & genres = (${genreId})
          & first_release_date < ${now}
          & version_parent = null
          & rating != null
          & rating_count > 50
          ${excludeClause};
        sort rating desc;
        limit ${needed};
      `);

      igdbFill = (igdbResults ?? []).map(g => ({
        ...shapeIGDB(g),
        rating: g.rating ? Math.round(g.rating / 20 * 10) / 10 : null,
        source: 'igdb',
      }));
    }

    return Response.json([...communityGames, ...igdbFill], {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
