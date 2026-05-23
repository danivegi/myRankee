import jwt from 'jsonwebtoken';
import pool from '@/lib/db';

export async function GET(request, { params }) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return Response.json({ favorited: false });

  let userId;
  try {
    const decoded = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    userId = decoded.id;
  } catch {
    return Response.json({ favorited: false });
  }

  const { igdb_game_id } = await params;

  const result = await pool.query(
    'SELECT 1 FROM favorite_games WHERE user_id = $1 AND igdb_game_id = $2',
    [userId, parseInt(igdb_game_id)]
  );

  return Response.json({ favorited: result.rows.length > 0 });
}
