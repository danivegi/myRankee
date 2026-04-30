import jwt from 'jsonwebtoken';
import pool from '@/lib/db';

function getUser(request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(auth.slice(7), process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

async function checkOwner(listId, userId) {
  const result = await pool.query('SELECT user_id FROM lists WHERE id = $1', [listId]);
  if (!result.rows.length) return { error: 'Lista no encontrada', status: 404 };
  if (result.rows[0].user_id !== userId) return { error: 'Sin permisos', status: 403 };
  return null;
}

export async function POST(request, { params }) {
  const { id } = await params;
  const user = getUser(request);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const err = await checkOwner(id, user.id);
  if (err) return Response.json({ error: err.error }, { status: err.status });

  const { igdb_game_id } = await request.json();
  if (!igdb_game_id) return Response.json({ error: 'Falta igdb_game_id' }, { status: 400 });

  try {
    await pool.query(
      'INSERT INTO list_games (list_id, igdb_game_id) VALUES ($1, $2)',
      [id, igdb_game_id]
    );
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
  const user = getUser(request);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const err = await checkOwner(id, user.id);
  if (err) return Response.json({ error: err.error }, { status: err.status });

  const { igdb_game_id } = await request.json();
  if (!igdb_game_id) return Response.json({ error: 'Falta igdb_game_id' }, { status: 400 });

  await pool.query(
    'DELETE FROM list_games WHERE list_id = $1 AND igdb_game_id = $2',
    [id, igdb_game_id]
  );

  return Response.json({ success: true });
}
