import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { checkRateLimit, getIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';
import { logSecurityEvent } from '@/lib/init-auth';

function getUser(request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try { return jwt.verify(auth.slice(7), process.env.JWT_SECRET); }
  catch { return null; }
}

export async function DELETE(request) {
  const user = getUser(request);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const ip = getIp(request);
  const rl = checkRateLimit(`delete:${ip}`, 5, 60_000);
  if (!rl.success) return rateLimitResponse(rl.retryAfter);

  const body = await request.json().catch(() => ({}));
  const { password } = body;
  if (!password) return Response.json({ error: 'Se requiere la contraseña para confirmar' }, { status: 400 });

  const userRow = await pool.query('SELECT id, password_hash FROM users WHERE id = $1', [user.id]);
  if (!userRow.rows.length) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 });

  const valid = await bcrypt.compare(password, userRow.rows[0].password_hash);
  if (!valid) {
    logSecurityEvent({ userId: user.id, eventType: 'delete_account_wrong_password', ip });
    return Response.json({ error: 'Contraseña incorrecta' }, { status: 401 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const uid = user.id;

    // Likes on user's reviews + likes the user gave
    await client.query('DELETE FROM review_likes WHERE review_id IN (SELECT id FROM reviews WHERE user_id = $1)', [uid]);
    await client.query('DELETE FROM review_likes WHERE user_id = $1', [uid]);

    // Comments
    await client.query('DELETE FROM comments WHERE user_id = $1', [uid]);

    // Reviews
    await client.query('DELETE FROM reviews WHERE user_id = $1', [uid]);

    // Ratings
    await client.query('DELETE FROM ratings WHERE user_id = $1', [uid]);

    // Backlog
    await client.query('DELETE FROM backlog WHERE user_id = $1', [uid]);

    // Lists (games + followers first)
    await client.query('DELETE FROM list_games     WHERE list_id IN (SELECT id FROM lists WHERE user_id = $1)', [uid]);
    await client.query('DELETE FROM list_followers WHERE list_id IN (SELECT id FROM lists WHERE user_id = $1)', [uid]);
    await client.query('DELETE FROM list_followers WHERE user_id = $1', [uid]);
    await client.query('DELETE FROM lists WHERE user_id = $1', [uid]);

    // Social
    await client.query('DELETE FROM follows WHERE follower_id = $1 OR followed_id = $1', [uid]);

    // Notifications
    await client.query('DELETE FROM notifications WHERE user_id = $1 OR from_user_id = $1', [uid]);

    // Achievements
    await client.query('DELETE FROM user_achievements WHERE user_id = $1', [uid]);

    // Activity log
    await client.query('DELETE FROM activity WHERE user_id = $1', [uid]);

    // Auth tokens
    await client.query('DELETE FROM email_verifications WHERE user_id = $1', [uid]);
    await client.query('DELETE FROM password_resets    WHERE user_id = $1', [uid]);
    await client.query('DELETE FROM login_attempts     WHERE email = (SELECT email FROM users WHERE id = $1)', [uid]);

    // Finally the user
    await client.query('DELETE FROM users WHERE id = $1', [uid]);

    await client.query('COMMIT');

    logSecurityEvent({ userId: null, eventType: 'account_deleted', ip, metadata: { deleted_user_id: uid } });

    return Response.json({ message: 'Cuenta eliminada correctamente' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[delete-account]', err);
    return Response.json({ error: 'Error al eliminar la cuenta. Inténtalo de nuevo.' }, { status: 500 });
  } finally {
    client.release();
  }
}
