import pool from '@/lib/db';

export async function GET(request, { params }) {
  const { id } = await params;

  const result = await pool.query(
    `SELECT
       ROUND(AVG(score)::numeric, 2)  AS avg_score,
       COUNT(*)                        AS total_ratings
     FROM ratings
     WHERE igdb_game_id = $1`,
    [id]
  );

  const reviews = await pool.query(
    'SELECT COUNT(*) AS total_reviews FROM reviews WHERE igdb_game_id = $1',
    [id]
  );

  const backlog = await pool.query(
    'SELECT COUNT(*) AS total_backlog FROM backlog WHERE igdb_game_id = $1',
    [id]
  );

  return Response.json({
    avg_score:     parseFloat(result.rows[0].avg_score) || null,
    total_ratings: parseInt(result.rows[0].total_ratings),
    total_reviews: parseInt(reviews.rows[0].total_reviews),
    total_backlog: parseInt(backlog.rows[0].total_backlog),
  }, {
    headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' },
  });
}
