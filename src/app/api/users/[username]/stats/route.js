import pool from '@/lib/db';
import { queryIGDB } from '@/lib/igdb';
import { translateGenre, translatePlatform } from '@/lib/translations';
import { parseDbDate } from '@/lib/dateUtils';

export async function GET(request, { params }) {
  const { username } = await params;

  const userResult = await pool.query(
    'SELECT id FROM users WHERE username = $1',
    [username]
  );
  if (!userResult.rows.length)
    return Response.json({ error: 'Usuario no encontrado' }, { status: 404 });

  const userId = userResult.rows[0].id;

  const ratingsResult = await pool.query(
    `SELECT igdb_game_id, score, created_at FROM ratings WHERE user_id = $1`,
    [userId]
  );
  const ratings = ratingsResult.rows;
  if (!ratings.length)
    return Response.json({ empty: true }, { headers: { 'Cache-Control': 'public, s-maxage=60' } });

  const totalRated = ratings.length;
  const avgScore = ratings.reduce((sum, r) => sum + parseFloat(r.score), 0) / totalRated;

  // Rating distribution: 0.5 → 5 in 0.5 steps
  const distribution = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map((s) => ({
    label: String(s),
    score: s,
    count: ratings.filter((r) => parseFloat(r.score) === s).length,
  }));

  // Games rated per year (last 5 years)
  const currentYear = new Date().getFullYear();
  const perYear = Array.from({ length: 5 }, (_, i) => {
    const year = currentYear - 4 + i;
    return {
      year: String(year),
      count: ratings.filter((r) => parseDbDate(r.created_at).getFullYear() === year).length,
    };
  });

  // Batch-fetch genres + platforms from IGDB in chunks of 500
  const uniqueIds = [...new Set(ratings.map((r) => r.igdb_game_id))];
  const genreMap    = {};
  const platformMap = {};
  const CHUNK = 500;

  try {
    for (let i = 0; i < uniqueIds.length; i += CHUNK) {
      const chunk = uniqueIds.slice(i, i + CHUNK);
      const games = await queryIGDB(
        'games',
        `fields id,genres.name,platforms.abbreviation,platforms.name;
         where id = (${chunk.join(',')});
         limit ${chunk.length};`
      );
      for (const g of games ?? []) {
        genreMap[g.id]    = g.genres?.map((gn) => translateGenre(gn.name)) ?? [];
        platformMap[g.id] = g.platforms?.map((p) => translatePlatform(p.abbreviation || p.name)) ?? [];
      }
    }
  } catch { /* non-fatal — return stats without genre/platform breakdowns */ }

  // Aggregate genre counts
  const genreCounts = {};
  for (const id of uniqueIds) {
    for (const genre of genreMap[id] ?? []) {
      genreCounts[genre] = (genreCounts[genre] ?? 0) + 1;
    }
  }
  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Aggregate platform counts — deduplicate per game so Windows+Mac+Linux → one "PC" count
  const platformCounts = {};
  for (const id of uniqueIds) {
    const platforms = [...new Set(platformMap[id] ?? [])];
    for (const platform of platforms) {
      platformCounts[platform] = (platformCounts[platform] ?? 0) + 1;
    }
  }
  const topPlatforms = Object.entries(platformCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  return Response.json(
    {
      totalRated,
      avgScore:    Math.round(avgScore * 10) / 10,
      topGenre:    topGenres[0]?.name    ?? null,
      topPlatform: topPlatforms[0]?.name ?? null,
      distribution,
      topGenres,
      topPlatforms,
      perYear,
    },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
  );
}
