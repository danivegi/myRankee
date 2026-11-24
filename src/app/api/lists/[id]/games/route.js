import { requireUser } from '@/lib/auth';
import pool from '@/lib/db';

async function checkOwner(listId, userId) {
  if (!/^\d+$/.test(String(listId))) return { error: 'Lista no encontrada', status: 404 };
  const result = await pool.query('SELECT user_id, is_public FROM lists WHERE id = $1', [listId]);
  if (!result.rows.length) return { error: 'Lista no encontrada', status: 404 };
  const list = result.rows[0];
  // Someone else's private list: same 404 as a missing one (don't reveal that the id exists).
  if (list.user_id !== userId) {
    return list.is_public ? { error: 'Sin permisos', status: 403 } : { error: 'Lista no encontrada', status: 404 };
  }
  return null;
}

export async function POST(request, { params }) {
  const { id } = await params;
  const session = await requireUser(request);
  if (session.response) return session.response;
  const user = session.user;

  const err = await checkOwner(id, user.id);
  if (err) return Response.json({ error: err.error }, { status: err.status });

  const { igdb_game_id } = await request.json();
  if (!igdb_game_id) return Response.json({ error: 'Falta igdb_game_id' }, { status: 400 });

  try {
    await pool.query(
      'INSERT INTO list_games (list_id, igdb_game_id) VALUES ($1, $2)',
      [id, igdb_game_id]
    );
    // Changing the games counts as updating the list ("Más seguidas" tie-break).
    await pool.query('UPDATE lists SET updated_at = NOW() WHERE id = $1', [id]);
  } catch (e) {
    if (e.code === '23505') {
      return Response.json({ error: 'El juego ya está en la lista' }, { status: 409 });
    }
    throw e;
  }

  return Response.json({ success: true }, { status: 201 });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const session = await requireUser(request);
  if (session.response) return session.response;
  const user = session.user;

  const err = await checkOwner(id, user.id);
  if (err) return Response.json({ error: err.error }, { status: err.status });

  const { igdb_game_id } = await request.json();
  if (!igdb_game_id) return Response.json({ error: 'Falta igdb_game_id' }, { status: 400 });

  const removed = await pool.query(
    'DELETE FROM list_games WHERE list_id = $1 AND igdb_game_id = $2',
    [id, igdb_game_id]
  );
  if (removed.rowCount > 0) await pool.query('UPDATE lists SET updated_at = NOW() WHERE id = $1', [id]);

  return Response.json({ success: true });
}
