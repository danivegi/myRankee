import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { checkPassword } from '@/lib/password';
import { ensureAuthTables, logSecurityEvent } from '@/lib/init-auth';
import { ensureReportsTables } from '@/lib/init-reports';
import { createDefaultNotificationPreferences } from '@/lib/init-notifications';
import { checkRateLimit, getIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';
import { validate, userRegistrationSchema, validationErrorResponse } from '@/lib/validation';
import { verifyCaptcha } from '@/lib/captcha';
import { sendVerificationEmail } from '@/lib/email';

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com','guerrillamail.com','tempmail.com','throwam.com','yopmail.com',
  'sharklasers.com','guerrillamailblock.com','grr.la','guerrillamail.info',
  'spam4.me','trashmail.com','trashmail.me','trashmail.net','dispostable.com',
  'maildrop.cc','discard.email','fakeinbox.com','mailnull.com','spamgourmet.com',
  'trashmail.at','trashmail.io','trashmail.org','tempinbox.com','getairmail.com',
]);

const BANNED_USERNAMES = new Set([
  'admin','administrator','mod','moderator','support','staff',
  'system','root','superuser','null','undefined','anonymous','guest',
  'bot','spam','test','abuse','security','api','www','mail',
]);

export async function POST(request) {
  try {
    await ensureAuthTables();
    await ensureReportsTables();

    const ip = getIp(request);
    const rl = checkRateLimit(`auth:reg:${ip}`, LIMITS.auth.limit, LIMITS.auth.windowMs);
    if (!rl.success) {
      logSecurityEvent({ eventType: 'rate_limit_exceeded', ip, metadata: { endpoint: 'register' } });
      return rateLimitResponse(rl.retryAfter);
    }

    const body = await request.json().catch(() => ({}));
    console.log('[register] Fields received:', Object.keys(body));

    // Honeypot check — bots fill hidden fields, humans leave them blank
    if (body.website) {
      logSecurityEvent({ eventType: 'honeypot_triggered', ip, metadata: { endpoint: 'register' } });
      return Response.json({ message: 'Cuenta creada. Revisa tu correo para verificarla.' }, { status: 201 });
    }

    // Check registration attempt frequency from DB
    const windowMs = 60 * 60 * 1000; // 1 hour
    const windowStart = new Date(Date.now() - windowMs);
    const attemptsRes = await pool.query(
      `SELECT COUNT(*) FROM registration_attempts WHERE ip_address = $1 AND created_at > $2`,
      [ip, windowStart]
    );
    if (parseInt(attemptsRes.rows[0].count) >= 5) {
      logSecurityEvent({ eventType: 'registration_spam', ip });
      return Response.json({ error: 'Demasiados intentos de registro. Espera una hora.' }, { status: 429 });
    }

    const { ok, data, errors } = validate(userRegistrationSchema, body);
    if (!ok) {
      console.log('[register] Validation failed:', errors);
      return validationErrorResponse(errors);
    }

    const { nombre, apellido, username, email, password, age_confirmed, captcha_token } = data;

    // Captcha verification
    const captchaOk = await verifyCaptcha(captcha_token);
    if (!captchaOk) {
      return Response.json({ error: 'Verificación de seguridad fallida. Inténtalo de nuevo.' }, { status: 400 });
    }

    // Disposable email check
    const emailDomain = email.split('@')[1]?.toLowerCase();
    if (DISPOSABLE_DOMAINS.has(emailDomain)) {
      return Response.json({ error: 'No se permiten correos temporales o desechables.' }, { status: 400 });
    }

    // Banned username check
    if (BANNED_USERNAMES.has(username.toLowerCase())) {
      return Response.json({ error: 'Este nombre de usuario no está disponible.' }, { status: 400 });
    }

    const { valid, results } = checkPassword(password);
    if (!valid) {
      const missing = (results ?? []).filter((r) => !r.met).map((r) => r.label);
      return Response.json({ error: `La contraseña no cumple los requisitos: ${missing.join(', ')}` }, { status: 400 });
    }

    // Log attempt before uniqueness check to track spam
    await pool.query(
      `INSERT INTO registration_attempts (ip_address, email, successful) VALUES ($1, $2, false)`,
      [ip, email]
    ).catch(() => {});

    const existing = await pool.query(
      'SELECT id, email, username FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existing.rows.length > 0) {
      const taken = existing.rows[0];
      const field = taken.email === email ? 'El correo electrónico' : 'El nombre de usuario';
      return Response.json({ error: `${field} ya está en uso` }, { status: 409 });
    }

    const password_hash = await bcrypt.hash(password, 10);

    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS age_confirmed BOOLEAN NOT NULL DEFAULT false`);

    const dbResult = await pool.query(
      `INSERT INTO users (nombre, apellido, username, email, password_hash, email_verified, terms_accepted_at, age_confirmed)
       VALUES ($1, $2, $3, $4, $5, false, NOW(), $6)
       RETURNING id, username, email`,
      [nombre, apellido, username, email, password_hash, age_confirmed === true]
    );

    const user = dbResult.rows[0];

    await createDefaultNotificationPreferences(user.id).catch(() => {});

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await pool.query(
      `INSERT INTO email_verifications (user_id, token, expires_at) VALUES ($1, $2, $3)`,
      [user.id, verificationToken, verificationExpiry]
    );
    sendVerificationEmail(email, verificationToken, username).catch((e) =>
      console.error('[register] sendVerificationEmail failed:', e.message)
    );

    // Mark attempt as successful
    await pool.query(
      `UPDATE registration_attempts SET successful = true WHERE ip_address = $1 AND email = $2 ORDER BY created_at DESC LIMIT 1`,
      [ip, email]
    ).catch(() => {});

    logSecurityEvent({
      userId: user.id,
      eventType: 'register',
      ip,
      userAgent: request.headers.get('user-agent'),
      metadata: { email, username },
    });

    return Response.json(
      { message: 'Cuenta creada. Revisa tu correo para verificarla.', email },
      { status: 201 }
    );
  } catch (err) {
    console.error('[register] Unexpected error:', err);
    return Response.json({ error: 'Error del servidor. Inténtalo de nuevo.' }, { status: 500 });
  }
}
