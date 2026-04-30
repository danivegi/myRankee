import crypto from 'crypto';
import pool from '@/lib/db';
import { ensureAuthTables } from '@/lib/init-auth';
import { sendPasswordResetEmail } from '@/lib/email';
import { checkRateLimit, getIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';
import { validate, emailSchema, validationErrorResponse } from '@/lib/validation';

export async function POST(request) {
  await ensureAuthTables();

  const ip = getIp(request);
  const rl = checkRateLimit(`auth:forgot:${ip}`, LIMITS.auth.limit, LIMITS.auth.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfter);

  const body = await request.json();
  const { ok, data, errors } = validate(emailSchema, body);
  if (!ok) return validationErrorResponse(errors);

  const { email } = data;

  const result = await pool.query(
    `SELECT id, username FROM users WHERE email = $1`,
    [email]
  );

  if (result.rows.length === 0) {
    return Response.json({ message: 'Si el correo está registrado, recibirás un enlace de recuperación.' });
  }

  const { id, username } = result.rows[0];

  await pool.query(`DELETE FROM password_resets WHERE user_id = $1`, [id]);

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await pool.query(
    `INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)`,
    [id, token, expiresAt]
  );

  await sendPasswordResetEmail(email, token, username);

  return Response.json({ message: 'Si el correo está registrado, recibirás un enlace de recuperación.' });
}
