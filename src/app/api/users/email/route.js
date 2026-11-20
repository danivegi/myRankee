import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { requireUser } from '@/lib/auth';
import pool from '@/lib/db';
import { sendEmailChangeNotice, sendEmailChangeVerification } from '@/lib/email';
import { ensureAuthTables, logSecurityEvent } from '@/lib/init-auth';
import { checkRateLimit, getIp, rateLimitResponse, LIMITS, writeLimitKey } from '@/lib/rate-limit';

// Each request sends two emails: at most 3 requests per user per hour.
const REQUEST_LIMIT = { limit: 3, windowMs: 60 * 60 * 1000 };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function PUT(request) {
  const session = await requireUser(request);
  if (session.response) return session.response;
  const user = session.user;

  const rl = checkRateLimit(writeLimitKey(request, user), LIMITS.write.limit, LIMITS.write.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfter);

  const body = await request.json().catch(() => ({}));
  const { new_email, password } = body;

  if (!new_email || !EMAIL_RE.test(new_email))
    return Response.json({ error: 'Introduce un correo válido' }, { status: 400 });

  if (!password)
    return Response.json({ error: 'Introduce tu contraseña actual' }, { status: 400 });

  const res = await pool.query(
    'SELECT password_hash, email, username FROM users WHERE id = $1',
    [user.id],
  );
  if (!res.rows.length)
    return Response.json({ error: 'Usuario no encontrado' }, { status: 404 });

  const { password_hash, email: currentEmail } = res.rows[0];

  if (new_email.toLowerCase() === currentEmail.toLowerCase())
    return Response.json({ error: 'El nuevo correo es igual al actual' }, { status: 400 });

  const valid = await bcrypt.compare(password, password_hash);
  if (!valid)
    return Response.json({ error: 'Contraseña incorrecta' }, { status: 401 });

  const taken = await pool.query(
    'SELECT id FROM users WHERE LOWER(email) = $1 AND id != $2',
    [new_email.toLowerCase(), user.id],
  );
  if (taken.rows.length)
    return Response.json({ error: 'Ese correo ya está en uso' }, { status: 409 });

  // The email does NOT change yet: the new address has to be confirmed from a link (24 h). Until then
  // the account keeps its current email, so a stolen session can't take the account over by moving it
  // to an attacker's address and resetting the password.
  const rlEmail = checkRateLimit(`email-change:${user.id}`, REQUEST_LIMIT.limit, REQUEST_LIMIT.windowMs);
  if (!rlEmail.success) return rateLimitResponse(rlEmail.retryAfter);

  await ensureAuthTables();
  const newEmail = new_email.toLowerCase();
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  // A new request replaces any pending one (its link stops working).
  await pool.query('DELETE FROM email_changes WHERE user_id = $1 AND used = false', [user.id]);
  await pool.query(
    `INSERT INTO email_changes (user_id, new_email, token_hash, expires_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '24 hours')`,
    [user.id, newEmail, tokenHash],
  );

  const username = res.rows[0].username;
  await Promise.all([
    sendEmailChangeVerification(newEmail, token, username),
    sendEmailChangeNotice(currentEmail, newEmail, username),
  ]);

  logSecurityEvent({ userId: user.id, eventType: 'email_change_requested', ip: getIp(request), metadata: { new_email: newEmail } });

  return Response.json({
    message: 'Te hemos enviado un enlace a tu nuevo email para confirmar el cambio. Hasta que lo confirmes, seguirás usando tu email actual.',
    pending_email: newEmail,
  });
}
