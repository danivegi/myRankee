import { requireUser } from '@/lib/auth';
import pool from '@/lib/db';

export async function POST(request) {
  const session = await requireUser(request);
  if (session.response) return session.response;
  const userId = session.user.id;

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
