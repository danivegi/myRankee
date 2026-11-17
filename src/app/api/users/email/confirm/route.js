import crypto from 'crypto';
import pool from '@/lib/db';
import { ensureAuthTables, logSecurityEvent } from '@/lib/init-auth';
import { checkRateLimit, getIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';

const INVALID = { error: 'Enlace inválido o ya utilizado' };

/**
 * Confirms a pending email change (link sent to the new address by PUT /api/users/email).
 * POST, not GET: email scanners that prefetch links must not be able to confirm it.
 * Idempotent like verify-email: opening the link again after it worked says it's already confirmed.
 *
 * 200 {message, email}                       → changed
 * 200 {message, email, already_confirmed}    → this link was already used and the account has that email
 * 400 {error}                                → unknown / used for something else / expired
 * 409 {error}                                → the address was taken by another account meanwhile
 */
export async function POST(request) {
  await ensureAuthTables();

  const ip = getIp(request);
  const rl = checkRateLimit(`auth:email-change:${ip}`, LIMITS.auth.limit, LIMITS.auth.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfter);

  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (!/^[0-9a-f]{64}$/.test(token)) return Response.json(INVALID, { status: 400 });
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const res = await client.query(
      `SELECT id, user_id, new_email, used, expires_at < NOW() AS expired
       FROM email_changes WHERE token_hash = $1 FOR UPDATE`,
      [tokenHash],
    );
    if (!res.rows.length) {
      await client.query('ROLLBACK');
      return Response.json(INVALID, { status: 400 });
    }
    const change = res.rows[0];

    if (change.used) {
      await client.query('ROLLBACK');
      const userRow = await pool.query('SELECT email FROM users WHERE id = $1', [change.user_id]);
      if (userRow.rows[0]?.email?.toLowerCase() === change.new_email) {
        return Response.json({
          message: 'Este cambio de email ya estaba confirmado.',
          email: change.new_email,
          already_confirmed: true,
        });
      }
      return Response.json(INVALID, { status: 400 });
    }

    if (change.expired) {
      await client.query('ROLLBACK');
      return Response.json(
        { error: 'El enlace ha caducado. Vuelve a solicitar el cambio desde Ajustes.' },
        { status: 400 },
      );
    }

    // Re-check: another account may have taken the address since the request.
    const taken = await client.query(
      'SELECT 1 FROM users WHERE LOWER(email) = $1 AND id != $2',
      [change.new_email, change.user_id],
    );
    if (taken.rows.length) {
      await client.query('ROLLBACK');
      return Response.json({ error: 'Ese correo ya está en uso' }, { status: 409 });
    }

    const old = await client.query('SELECT email FROM users WHERE id = $1', [change.user_id]);
    let updated;
    try {
      // Opening the link proves the new address works: it counts as verified.
      updated = await client.query(
        'UPDATE users SET email = $1, email_verified = true WHERE id = $2',
        [change.new_email, change.user_id],
      );
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.code === '23505') return Response.json({ error: 'Ese correo ya está en uso' }, { status: 409 });
      throw err;
    }
    if (updated.rowCount === 0) {
      await client.query('ROLLBACK');
      return Response.json(INVALID, { status: 400 });
    }

    await client.query('UPDATE email_changes SET used = true, used_at = NOW() WHERE id = $1', [change.id]);
    // Any other pending request of this user is void now.
    await client.query(
      'DELETE FROM email_changes WHERE user_id = $1 AND used = false AND id != $2',
      [change.user_id, change.id],
    );
    await client.query('COMMIT');

    logSecurityEvent({
      userId: change.user_id,
      eventType: 'email_changed',
      ip,
      metadata: { old_email: old.rows[0]?.email ?? null, new_email: change.new_email },
    });

    return Response.json({ message: 'Email actualizado correctamente', email: change.new_email });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[email-change:confirm]', err);
    return Response.json({ error: 'No se ha podido confirmar el cambio. Inténtalo de nuevo.' }, { status: 500 });
  } finally {
    client.release();
  }
}
