import jwt from 'jsonwebtoken';
import pool from '@/lib/db';

export async function DELETE(request, { params }) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return Response.json({ error: 'No autorizado' }, { status: 401 });

  let userId;
  try {
    const decoded = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    userId = decoded.id;
  } catch {
    return Response.json({ error: 'Token inválido' }, { status: 401 });
  }

  const { position } = await params;

  await pool.query(
    'DELETE FROM favorite_games_top WHERE user_id = $1 AND position = $2',
    [userId, parseInt(position)]
  );

  return Response.json({ ok: true });
}
