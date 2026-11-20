import { renewedToken, resolveSession, SESSION_EXPIRED } from '@/lib/auth';
import pool from '@/lib/db';
import { sanitizeUser } from '@/lib/sanitize';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return Response.json({ error: 'Token no proporcionado' }, { status: 401 });
  }

  // Bad/expired/revoked token or deleted account → 401 (it used to be a 404 for deleted accounts),
  // so both clients sign out.
  const session = await resolveSession(request);
  if (session.status === 'invalid') {
    return Response.json({ error: SESSION_EXPIRED }, { status: 401 });
  }
  if (session.status === 'suspended') {
    return Response.json(
      {
        error: 'Tu cuenta ha sido suspendida.',
        suspended: true,
        suspended_reason: session.user.suspended_reason ?? 'Violación de los términos de servicio.',
      },
      { status: 403 }
    );
  }

  const result = await pool.query(
    'SELECT id, nombre, apellido, username, email, avatar_url, bio, banner_url, banner_position, created_at, is_admin, is_suspended, suspended_reason FROM users WHERE id = $1',
    [session.user.id]
  );
  if (!result.rows.length) return Response.json({ error: SESSION_EXPIRED }, { status: 401 });

  // Sliding renewal: a token older than 7 days gets a fresh 30-day one.
  const token = renewedToken(session);
  return Response.json({ user: sanitizeUser(result.rows[0], { includeEmail: true }), ...(token ? { token } : {}) });
}
