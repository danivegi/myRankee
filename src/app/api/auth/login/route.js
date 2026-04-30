import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { ensureAuthTables, logSecurityEvent } from '@/lib/init-auth';
import { validate, userLoginSchema, validationErrorResponse } from '@/lib/validation';
import { checkRateLimit, getIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';
import { sanitizeUser } from '@/lib/sanitize';
import { verifyCaptcha } from '@/lib/captcha';

export async function POST(request) {
  await ensureAuthTables();

  const ip = getIp(request);
  const rl = checkRateLimit(`auth:login:${ip}`, LIMITS.auth.limit, LIMITS.auth.windowMs);
  if (!rl.success) {
    logSecurityEvent({ eventType: 'rate_limit_exceeded', ip, metadata: { endpoint: 'login' } });
    return rateLimitResponse(rl.retryAfter);
  }

  const body = await request.json().catch(() => ({}));
  const { ok, data, errors } = validate(userLoginSchema, body);
  if (!ok) return validationErrorResponse(errors);

  const { email, password, captcha_token } = data;
  const window = new Date(Date.now() - 15 * 60 * 1000);

  await pool.query(`DELETE FROM login_attempts WHERE attempted_at < $1`, [window]);

  const [byEmail, byIp] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) FROM login_attempts WHERE email = $1 AND successful = false AND attempted_at > $2`,
      [email, window]
    ),
    pool.query(
      `SELECT COUNT(*) FROM login_attempts WHERE ip_address = $1 AND successful = false AND attempted_at > $2`,
      [ip, window]
    ),
  ]);

  const emailFailures = parseInt(byEmail.rows[0].count);
  const ipFailures    = parseInt(byIp.rows[0].count);

  if (emailFailures >= 5) {
    logSecurityEvent({ eventType: 'login_blocked_email', ip, metadata: { email } });
    return Response.json(
      { error: 'Demasiados intentos fallidos. Espera 15 minutos antes de intentarlo de nuevo.' },
      { status: 429 }
    );
  }
  if (ipFailures >= 10) {
    logSecurityEvent({ eventType: 'login_blocked_ip', ip, metadata: { email } });
    return Response.json(
      { error: 'Demasiados intentos desde esta dirección. Espera 15 minutos.' },
      { status: 429 }
    );
  }

  // Require captcha after 2 failed attempts for this email
  if (emailFailures >= 2) {
    const captchaOk = await verifyCaptcha(captcha_token);
    if (!captchaOk) {
      return Response.json(
        { error: 'Verificación de seguridad requerida.', requires_captcha: true },
        { status: 400 }
      );
    }
  }

  const result = await pool.query(
    'SELECT id, nombre, apellido, username, email, password_hash, avatar_url, bio, created_at, email_verified, is_suspended, suspended_reason FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    await pool.query(
      `INSERT INTO login_attempts (email, ip_address, successful) VALUES ($1, $2, false)`,
      [email, ip]
    );
    logSecurityEvent({ eventType: 'login_failure', ip, metadata: { email, reason: 'user_not_found' } });
    return Response.json({ error: 'Credenciales incorrectas' }, { status: 401 });
  }

  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);

  if (!valid) {
    await pool.query(
      `INSERT INTO login_attempts (email, ip_address, successful) VALUES ($1, $2, false)`,
      [email, ip]
    );
    logSecurityEvent({ eventType: 'login_failure', ip, metadata: { email, reason: 'wrong_password' } });
    const failCount = emailFailures + 1;
    return Response.json(
      {
        error: 'Credenciales incorrectas',
        requires_captcha: failCount >= 2,
      },
      { status: 401 }
    );
  }

  await pool.query(
    `INSERT INTO login_attempts (email, ip_address, successful) VALUES ($1, $2, true)`,
    [email, ip]
  );

  if (!user.email_verified) {
    return Response.json({ needs_verification: true, email }, { status: 403 });
  }

  if (user.is_suspended) {
    logSecurityEvent({ eventType: 'login_suspended', ip, metadata: { email } });
    return Response.json(
      {
        error: 'Tu cuenta ha sido suspendida.',
        suspended_reason: user.suspended_reason ?? 'Violación de los términos de servicio.',
      },
      { status: 403 }
    );
  }

  logSecurityEvent({
    userId: user.id,
    eventType: 'login_success',
    ip,
    userAgent: request.headers.get('user-agent'),
    metadata: { email },
  });

  const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });

  return Response.json({ token, user: sanitizeUser(user, { includeEmail: true }) });
}
