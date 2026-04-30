import crypto from 'crypto';
import pool from '@/lib/db';
import { ensureAuthTables } from '@/lib/init-auth';
import { sendVerificationEmail } from '@/lib/email';
import { checkRateLimit, getIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';
import { validate, emailSchema, validationErrorResponse } from '@/lib/validation';

const SAFE_MSG = { message: 'Si el correo existe y no está verificado, recibirás un nuevo enlace.' };

export async function POST(request) {
  await ensureAuthTables();

  const ip = getIp(request);
  const rl = checkRateLimit(`auth:resend:${ip}`, LIMITS.auth.limit, LIMITS.auth.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfter);

  const body = await request.json();
  const { ok, data, errors } = validate(emailSchema, body);
  if (!ok) return validationErrorResponse(errors);

  const { email } = data;

  const result = await pool.query(
    `SELECT id, username, email_verified FROM users WHERE email = $1`,
    [email]
  );

  if (result.rows.length === 0 || result.rows[0].email_verified) {
    return Response.json(SAFE_MSG);
  }

  const { id, username } = result.rows[0];

  await pool.query(`DELETE FROM email_verifications WHERE user_id = $1`, [id]);

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await pool.query(
    `INSERT INTO email_verifications (user_id, token, expires_at) VALUES ($1, $2, $3)`,
    [id, token, expiresAt]
  );

  await sendVerificationEmail(email, token, username);

  return Response.json(SAFE_MSG);
}
