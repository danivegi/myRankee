import jwt from 'jsonwebtoken';
import pool from '@/lib/db';

export async function POST(request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return Response.json({ error: 'No autorizado' }, { status: 401 });

  let userId;
  try {
    const decoded = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    userId = decoded.id;
  } catch {
    return Response.json({ error: 'Token inválido' }, { status: 401 });
  }

  const { igdb_game_id } = await request.json();
  if (!igdb_game_id) return Response.json({ error: 'igdb_game_id requerido' }, { status: 400 });

  await pool.query(
    `INSERT INTO favorite_games (user_id, igdb_game_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, igdb_game_id) DO NOTHING`,
    [userId, igdb_game_id]
  );

  return Response.json({ ok: true });
}
