import { requireUser } from '@/lib/auth';
import pool from '@/lib/db';

export async function PUT(request) {
  const session = await requireUser(request);
  if (session.response) return session.response;
  const userId = session.user.id;

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
