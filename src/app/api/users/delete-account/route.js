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

    // Comments on the user's reviews (by others), then comments the user wrote
    await client.query('DELETE FROM review_comments WHERE review_id IN (SELECT id FROM reviews WHERE user_id = $1)', [uid]);
    await client.query('DELETE FROM review_comments WHERE user_id = $1', [uid]);

    // Reports about the user's reviews and comments, plus reports made by the user
    await client.query(
      `DELETE FROM reports WHERE target_type = 'review' AND target_id IN (SELECT id FROM reviews WHERE user_id = $1)`,
      [uid]
    );
    await client.query(
      `DELETE FROM reports WHERE target_type = 'comment' AND target_id IN (SELECT id FROM review_comments WHERE user_id = $1)`,
      [uid]
    );
    await client.query('DELETE FROM reports WHERE reporter_id = $1', [uid]);

    // Reviews and ratings
    await client.query('DELETE FROM reviews WHERE user_id = $1', [uid]);
    await client.query('DELETE FROM ratings WHERE user_id = $1', [uid]);

    // Backlog
    await client.query('DELETE FROM backlog WHERE user_id = $1', [uid]);

    // Lists (games + followers first)
    await client.query('DELETE FROM list_games     WHERE list_id IN (SELECT id FROM lists WHERE user_id = $1)', [uid]);
    await client.query('DELETE FROM list_followers WHERE list_id IN (SELECT id FROM lists WHERE user_id = $1)', [uid]);
    await client.query('DELETE FROM list_followers WHERE user_id = $1', [uid]);
    await client.query('DELETE FROM lists WHERE user_id = $1', [uid]);

    // Favorites
    await client.query('DELETE FROM favorite_games     WHERE user_id = $1', [uid]);
    await client.query('DELETE FROM favorite_games_top WHERE user_id = $1', [uid]);

    // Social links and follows
    await client.query('DELETE FROM user_social_links WHERE user_id = $1', [uid]);
    await client.query('DELETE FROM follows WHERE follower_id = $1 OR followed_id = $1', [uid]);

    // Notifications
    await client.query('DELETE FROM notifications WHERE user_id = $1 OR from_user_id = $1', [uid]);

    // Achievements and preferences
    await client.query('DELETE FROM user_achievements             WHERE user_id = $1', [uid]);
    await client.query('DELETE FROM user_notification_preferences WHERE user_id = $1', [uid]);

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
