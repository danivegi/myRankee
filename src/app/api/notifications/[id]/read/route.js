import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { ensureNotificationsTable } from '@/lib/init-notifications';

function getUser(request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(auth.slice(7), process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

export async function PUT(request, { params }) {
  const user = getUser(request);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { id } = await params;

  await ensureNotificationsTable();

  const res = await pool.query(
    'UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2 RETURNING id',
    [id, user.id]
  );

  if (!res.rows.length)
    return Response.json({ error: 'No encontrada' }, { status: 404 });

  return Response.json({ ok: true });
}
