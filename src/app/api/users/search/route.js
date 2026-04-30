import pool from '@/lib/db';

export async function GET(request) {
  const q = request.nextUrl.searchParams.get('q')?.trim();
  if (!q) return Response.json([]);

  try {
    const res = await pool.query(
      `SELECT u.id, u.username, u.nombre, u.apellido, u.avatar_url, u.bio,
              (SELECT COUNT(*) FROM ratings WHERE user_id = u.id)::int AS total_ratings,
              (SELECT COUNT(*) FROM reviews WHERE user_id = u.id)::int AS total_reviews
       FROM users u
       WHERE u.username ILIKE $1
          OR u.nombre   ILIKE $1
          OR u.apellido ILIKE $1
          OR (u.nombre || ' ' || COALESCE(u.apellido, '')) ILIKE $1
       ORDER BY
         CASE WHEN u.username ILIKE $2 THEN 0 ELSE 1 END,
         u.username
       LIMIT 10`,
      [`%${q}%`, `${q}%`]
    );
    return Response.json(res.rows);
  } catch (err) {
    console.error('[users/search]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
