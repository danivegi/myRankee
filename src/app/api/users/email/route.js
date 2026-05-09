import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { checkRateLimit, getIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getUser(request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try { return jwt.verify(auth.slice(7), process.env.JWT_SECRET); }
  catch { return null; }
}

export async function PUT(request) {
  const user = getUser(request);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const ip = getIp(request);
  const rl = checkRateLimit(`write:${ip}`, LIMITS.write.limit, LIMITS.write.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfter);

  const body = await request.json().catch(() => ({}));
  const { new_email, password } = body;

  if (!new_email || !EMAIL_RE.test(new_email))
    return Response.json({ error: 'Introduce un correo válido' }, { status: 400 });

  if (!password)
    return Response.json({ error: 'Introduce tu contraseña actual' }, { status: 400 });

  const res = await pool.query(
    'SELECT password_hash, email FROM users WHERE id = $1',
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

  await pool.query(
    'UPDATE users SET email = $1 WHERE id = $2',
    [new_email.toLowerCase(), user.id],
  );

  return Response.json({ message: 'Correo actualizado correctamente' });
}
