import pool from '@/lib/db';
import { ensureAuthTables, logSecurityEvent } from '@/lib/init-auth';
import { checkRateLimit, getIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';

export async function GET(request) {
  await ensureAuthTables();

  const ip = getIp(request);
  const rl = checkRateLimit(`auth:verify:${ip}`, LIMITS.auth.limit, LIMITS.auth.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfter);

  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return Response.json({ error: 'Token requerido' }, { status: 400 });
  }

  const result = await pool.query(
    `SELECT id, user_id, expires_at, used FROM email_verifications WHERE token = $1`,
    [token]
  );

  if (result.rows.length === 0) {
    return Response.json({ error: 'Token inválido o ya utilizado' }, { status: 400 });
  }

  const { id, user_id, expires_at, used } = result.rows[0];

  // Token already consumed — idempotent success if the user is verified, error otherwise.
  if (used) {
    const userRow = await pool.query(`SELECT email_verified FROM users WHERE id = $1`, [user_id]);
    if (userRow.rows.length > 0 && userRow.rows[0].email_verified) {
      return Response.json({ message: 'Cuenta ya verificada. Puedes iniciar sesión.' });
    }
    return Response.json({ error: 'Token inválido o ya utilizado' }, { status: 400 });
  }

  if (new Date() > new Date(expires_at)) {
    return Response.json({ error: 'El enlace ha caducado. Solicita uno nuevo.' }, { status: 400 });
  }

  const updateResult = await pool.query(
    `UPDATE users SET email_verified = true WHERE id = $1`,
    [user_id]
  );

  // Fix 3: 0 rows means the user was deleted directly from the DB (orphaned token) — don't succeed.
  if (updateResult.rowCount === 0) {
    await pool.query(`UPDATE email_verifications SET used = true WHERE id = $1`, [id]);
    return Response.json({ error: 'Token inválido o ya utilizado' }, { status: 400 });
  }

  await pool.query(`UPDATE email_verifications SET used = true WHERE id = $1`, [id]);

  logSecurityEvent({ userId: user_id, eventType: 'email_verified', ip });

  return Response.json({ message: 'Email verificado correctamente' });
}
