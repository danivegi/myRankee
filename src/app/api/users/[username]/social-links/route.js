import pool from '@/lib/db';

export async function GET(request, { params }) {
  const { username } = await params;

  const userRes = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
  if (!userRes.rows.length) return Response.json({ error: 'Not found' }, { status: 404 });

  const userId = userRes.rows[0].id;

  const res = await pool.query(
    'SELECT platform, url FROM user_social_links WHERE user_id = $1 ORDER BY platform',
    [userId]
  );

  return Response.json(res.rows);
}
