import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { sanitizeUser } from '@/lib/sanitize';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return Response.json({ error: 'Token no proporcionado' }, { status: 401 });
  }

  let payload;
  try {
    payload = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
  } catch {
    return Response.json({ error: 'Token inválido o expirado' }, { status: 401 });
  }

  const result = await pool.query(
    'SELECT id, nombre, apellido, username, email, avatar_url, bio, created_at, is_admin, is_suspended, suspended_reason FROM users WHERE id = $1',
    [payload.id]
  );

  if (!result.rows.length) {
    return Response.json({ error: 'Usuario no encontrado' }, { status: 404 });
  }

  const user = result.rows[0];

  if (user.is_suspended) {
    return Response.json(
      {
        error: 'Tu cuenta ha sido suspendida.',
        suspended_reason: user.suspended_reason ?? 'Violación de los términos de servicio.',
      },
      { status: 403 }
    );
  }

  return Response.json({ user: sanitizeUser(user, { includeEmail: true }) });
}
