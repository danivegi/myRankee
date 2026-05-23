import jwt from 'jsonwebtoken';
import pool from '@/lib/db';

export async function PUT(request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return Response.json({ error: 'No autorizado' }, { status: 401 });

  let userId;
  try {
    const decoded = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    userId = decoded.id;
  } catch {
    return Response.json({ error: 'Token inválido' }, { status: 401 });
  }

  const { igdb_game_id, position } = await request.json();
  if (!igdb_game_id || !position || position < 1 || position > 5)
    return Response.json({ error: 'igdb_game_id y position (1–5) requeridos' }, { status: 400 });

  await pool.query(
    `INSERT INTO favorite_games_top (user_id, igdb_game_id, position)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, position) DO UPDATE SET igdb_game_id = $2, created_at = now()`,
    [userId, igdb_game_id, position]
  );

  return Response.json({ ok: true });
}
