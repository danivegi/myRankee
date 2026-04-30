import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { checkPassword } from '@/lib/password';
import { ensureAuthTables, logSecurityEvent } from '@/lib/init-auth';
import { checkRateLimit, getIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';
import { validate, passwordResetSchema, validationErrorResponse } from '@/lib/validation';

export async function POST(request) {
  await ensureAuthTables();

  const ip = getIp(request);
  const rl = checkRateLimit(`auth:reset:${ip}`, LIMITS.auth.limit, LIMITS.auth.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfter);

  const body = await request.json();
  const { ok, data, errors } = validate(passwordResetSchema, body);
  if (!ok) return validationErrorResponse(errors);

  const { token, password } = data;

  const { valid, results } = checkPassword(password);
  if (!valid) {
    const missing = results.filter((r) => !r.met).map((r) => r.label);
    return Response.json({ error: `La contraseña no cumple los requisitos: ${missing.join(', ')}` }, { status: 400 });
  }

  const result = await pool.query(
    `SELECT id, user_id, expires_at, used FROM password_resets WHERE token = $1`,
    [token]
  );

  if (result.rows.length === 0 || result.rows[0].used) {
    return Response.json({ error: 'Token inválido o ya utilizado' }, { status: 400 });
  }

  const { id, user_id, expires_at } = result.rows[0];

  if (new Date() > new Date(expires_at)) {
    return Response.json({ error: 'El enlace ha caducado. Solicita uno nuevo.' }, { status: 400 });
  }

  const hash = await bcrypt.hash(password, 10);
  await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hash, user_id]);
  await pool.query(`UPDATE password_resets SET used = true WHERE id = $1`, [id]);

  logSecurityEvent({ userId: user_id, eventType: 'password_reset', ip });

  return Response.json({ message: 'Contraseña actualizada correctamente' });
}
