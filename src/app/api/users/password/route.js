import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { checkPassword } from '@/lib/password';
import { logSecurityEvent } from '@/lib/init-auth';
import { checkRateLimit, getIp, rateLimitResponse, LIMITS, writeLimitKey } from '@/lib/rate-limit';

function getUser(request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(auth.slice(7), process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

export async function PUT(request) {
  const user = getUser(request);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const ip = getIp(request);
  const rl = checkRateLimit(writeLimitKey(request, user), LIMITS.write.limit, LIMITS.write.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfter);

  const { current_password, new_password } = await request.json();

  if (!current_password || !new_password)
    return Response.json({ error: 'Todos los campos son obligatorios' }, { status: 400 });

  const { valid, results } = checkPassword(new_password);
  if (!valid) {
    const missing = results.filter((r) => !r.met).map((r) => r.label);
    return Response.json({ error: `La contraseña no cumple los requisitos: ${missing.join(', ')}` }, { status: 400 });
  }

  const result = await pool.query(
    'SELECT password_hash FROM users WHERE id = $1',
    [user.id]
  );

  if (!result.rows.length)
    return Response.json({ error: 'Usuario no encontrado' }, { status: 404 });

  const currentValid = await bcrypt.compare(current_password, result.rows[0].password_hash);
  if (!currentValid)
    return Response.json({ error: 'La contraseña actual es incorrecta' }, { status: 400 });

  const hash = await bcrypt.hash(new_password, 10);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, user.id]);

  logSecurityEvent({ userId: user.id, eventType: 'password_change', ip });

  return Response.json({ message: 'Contraseña actualizada correctamente' });
}
