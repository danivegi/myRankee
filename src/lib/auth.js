import jwt from 'jsonwebtoken';
import pool from './db';

/**
 * Sessions. This is the ONLY module that signs or verifies JWTs.
 *
 * - Tokens are HS256, last 30 days and carry { id, tv } (tv = users.token_version). Tokens issued
 *   before token_version existed have no `tv` and count as version 0; old 7-day tokens keep working
 *   until they expire.
 * - Every authenticated request loads the user in ONE primary-key query: a deleted user or a
 *   token_version mismatch (password change/reset, "cerrar sesión en todos los dispositivos") is a
 *   401; a suspended account is a 403 with its reason. Suspension doesn't bump the version, so the
 *   clients can show why.
 * - Sliding renewal: GET /api/auth/me hands out a fresh token once the current one is older than
 *   RENEW_AFTER_SECONDS, so active users never get signed out.
 */

const ALGORITHM = 'HS256';
const TOKEN_TTL = '30d';
export const RENEW_AFTER_SECONDS = 7 * 24 * 60 * 60;

export const SESSION_EXPIRED = 'Sesión caducada. Vuelve a iniciar sesión.';
const SUSPENDED = 'Tu cuenta ha sido suspendida.';
const DEFAULT_SUSPENDED_REASON = 'Violación de los términos de servicio.';

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error('JWT_SECRET is not set');
  return value;
}

/** A new 30-day session token for `user` ({ id, token_version }). */
export function signToken(user) {
  return jwt.sign({ id: user.id, tv: user.token_version ?? 0 }, secret(), {
    algorithm: ALGORITHM,
    expiresIn: TOKEN_TTL,
  });
}

function bearer(request) {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

function decode(token) {
  try {
    return jwt.verify(token, secret(), { algorithms: [ALGORITHM] });
  } catch {
    return null;
  }
}

let columnReady = false;

/** Same SQL as the migration run in Supabase (kept here like the other ensure* helpers). */
export async function ensureTokenVersionColumn() {
  if (columnReady) return;
  try {
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0');
    columnReady = true;
  } catch (e) {
    console.error('ensureTokenVersionColumn:', e.message);
  }
}

const USER_COLUMNS = `id, username, nombre, apellido, email, avatar_url, is_admin, is_suspended,
                      suspended_reason, email_verified, token_version`;

/**
 * Who is calling: { status: 'none' } (no token) | { status: 'invalid' } (bad/expired/revoked token or
 * deleted user) | { status: 'suspended', user } | { status: 'ok', user, issuedAt }.
 */
export async function resolveSession(request) {
  const token = bearer(request);
  if (!token) return { status: 'none' };
  const payload = decode(token);
  if (!payload?.id) return { status: 'invalid' };

  await ensureTokenVersionColumn();
  const res = await pool.query(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [payload.id]);
  const user = res.rows[0];
  if (!user) return { status: 'invalid' };
  if ((payload.tv ?? 0) !== (user.token_version ?? 0)) return { status: 'invalid' };
  if (user.is_suspended) return { status: 'suspended', user };
  return { status: 'ok', user, issuedAt: payload.iat ?? null };
}

function suspendedResponse(user) {
  return Response.json(
    { error: SUSPENDED, suspended: true, suspended_reason: user.suspended_reason ?? DEFAULT_SUSPENDED_REASON },
    { status: 403 }
  );
}

/**
 * For routes that need a signed-in user: { user } or { response } (return it as is).
 * No token → 401 'No autenticado' (as before); dead token → 401 SESSION_EXPIRED; suspended → 403.
 */
export async function requireUser(request) {
  const session = await resolveSession(request);
  if (session.status === 'ok') return { user: session.user, issuedAt: session.issuedAt };
  if (session.status === 'suspended') return { response: suspendedResponse(session.user) };
  if (session.status === 'none') return { response: Response.json({ error: 'No autenticado' }, { status: 401 }) };
  return { response: Response.json({ error: SESSION_EXPIRED }, { status: 401 }) };
}

/** requireUser + is_admin; non-admins get a 403 with `message`. */
export async function requireAdmin(request, message = 'Acceso denegado') {
  const session = await requireUser(request);
  if (session.response) return session;
  if (!session.user.is_admin) return { response: Response.json({ error: message }, { status: 403 }) };
  return session;
}

/**
 * For public routes that personalize for a signed-in viewer: the user, or null. A dead token or a
 * suspended account is treated as signed out (public pages keep working).
 */
export async function optionalUser(request) {
  const session = await resolveSession(request);
  return session.status === 'ok' ? session.user : null;
}

/** A fresh token when the current one is older than RENEW_AFTER_SECONDS (sliding renewal), else null. */
export function renewedToken(session) {
  if (!session?.user || session.issuedAt == null) return null;
  const age = Math.floor(Date.now() / 1000) - session.issuedAt;
  return age > RENEW_AFTER_SECONDS ? signToken(session.user) : null;
}

/** Signs out every device: bumps token_version and returns the user's new version. */
export async function bumpTokenVersion(userId, client = pool) {
  await ensureTokenVersionColumn();
  const res = await client.query(
    'UPDATE users SET token_version = token_version + 1 WHERE id = $1 RETURNING token_version',
    [userId]
  );
  return res.rows[0]?.token_version ?? null;
}
