import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { ensureAuthTables, logSecurityEvent } from '@/lib/init-auth';
import { validate, userLoginSchema, validationErrorResponse } from '@/lib/validation';
import { checkRateLimit, getIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';
import { sanitizeUser } from '@/lib/sanitize';
import { verifyCaptcha } from '@/lib/captcha';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const { identifier, password, captcha_token } = data;
  const isEmail = EMAIL_RE.test(identifier);
  // login_attempts.email stores this normalized identifier (email or username)
  const logIdentifier = identifier.toLowerCase();

  const window = new Date(Date.now() - 15 * 60 * 1000);

  await pool.query(`DELETE FROM login_attempts WHERE attempted_at < $1`, [window]);

  // Lockout is keyed by identifier + IP, so many users behind one mobile-carrier
  // IP don't lock each other out. The IP-only count is a high safety net.
  // The identifier-only count (any IP) never locks — it only forces captcha,
  // to slow down attacks on one account spread across many IPs.
  const [byPair, byIp, byIdentifier] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) FROM login_attempts
       WHERE email = $1 AND ip_address = $2 AND successful = false AND attempted_at > $3`,
      [logIdentifier, ip, window]
    ),
    pool.query(
      `SELECT COUNT(*) FROM login_attempts WHERE ip_address = $1 AND successful = false AND attempted_at > $2`,
      [ip, window]
    ),
    pool.query(
      `SELECT COUNT(*) FROM login_attempts WHERE email = $1 AND successful = false AND attempted_at > $2`,
      [logIdentifier, window]
    ),
  ]);

  const pairFailures       = parseInt(byPair.rows[0].count);
  const ipFailures         = parseInt(byIp.rows[0].count);
  const identifierFailures = parseInt(byIdentifier.rows[0].count);

  const PAIR_CAPTCHA_AFTER       = 2; // failures for this identifier from this IP
  const IDENTIFIER_CAPTCHA_AFTER = 5; // failures for this identifier from any IP
  const needsCaptcha = (pair, any) => pair >= PAIR_CAPTCHA_AFTER || any >= IDENTIFIER_CAPTCHA_AFTER;

  if (pairFailures >= 10) {
    logSecurityEvent({ eventType: 'login_blocked_identifier_ip', ip, metadata: { identifier } });
    return Response.json(
      { error: 'Demasiados intentos fallidos. Espera 15 minutos antes de intentarlo de nuevo.' },
      { status: 429 }
    );
  }
  if (ipFailures >= 100) {
    logSecurityEvent({ eventType: 'login_blocked_ip', ip, metadata: { identifier } });
    return Response.json(
      { error: 'Demasiados intentos desde esta dirección. Espera 15 minutos.' },
      { status: 429 }
    );
  }

  // Require captcha after 2 failures for this identifier + IP,
  // or after 5 failures for this identifier from any IP
  if (needsCaptcha(pairFailures, identifierFailures)) {
    const captchaOk = await verifyCaptcha(captcha_token);
    if (!captchaOk) {
      return Response.json(
        { error: 'Verificación de seguridad requerida.', requires_captcha: true },
        { status: 400 }
      );
    }
  }

  // Look up by email or username
  const result = await pool.query(
    `SELECT id, nombre, apellido, username, email, password_hash, avatar_url, bio, created_at,
            email_verified, is_suspended, suspended_reason
     FROM users
     WHERE ${isEmail ? 'LOWER(email) = $1' : 'LOWER(username) = $1'}`,
    [logIdentifier]
  );

  if (result.rows.length === 0) {
    await pool.query(
      `INSERT INTO login_attempts (email, ip_address, successful) VALUES ($1, $2, false)`,
      [logIdentifier, ip]
    );
    logSecurityEvent({ eventType: 'login_failure', ip, metadata: { identifier: logIdentifier, reason: 'user_not_found' } });
    return Response.json({ error: 'Credenciales incorrectas' }, { status: 401 });
  }

  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);

  if (!valid) {
    await pool.query(
      `INSERT INTO login_attempts (email, ip_address, successful) VALUES ($1, $2, false)`,
      [logIdentifier, ip]
    );
    logSecurityEvent({ eventType: 'login_failure', ip, metadata: { identifier: logIdentifier, reason: 'wrong_password' } });
    // Counting this failure, will the next attempt need captcha?
    return Response.json(
      { error: 'Credenciales incorrectas', requires_captcha: needsCaptcha(pairFailures + 1, identifierFailures + 1) },
      { status: 401 }
    );
  }

  await pool.query(
    `INSERT INTO login_attempts (email, ip_address, successful) VALUES ($1, $2, true)`,
    [logIdentifier, ip]
  );

  if (!user.email_verified) {
    return Response.json({ needs_verification: true, email: user.email }, { status: 403 });
  }

  if (user.is_suspended) {
    logSecurityEvent({ eventType: 'login_suspended', ip, metadata: { identifier: logIdentifier } });
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
    metadata: { identifier: logIdentifier },
  });

  const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });

  return Response.json({ token, user: sanitizeUser(user, { includeEmail: true }) });
}
