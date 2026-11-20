import { requireUser } from '@/lib/auth';
import pool from '@/lib/db';
import { ensureNotificationsTable } from '@/lib/init-notifications';

export async function PUT(request, { params }) {
  const session = await requireUser(request);
  if (session.response) return session.response;
  const user = session.user;

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
