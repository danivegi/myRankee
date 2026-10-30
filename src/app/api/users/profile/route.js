import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { checkRateLimit, rateLimitResponse, LIMITS, writeLimitKey } from '@/lib/rate-limit';
import { validate, profileUpdateSchema, validationErrorResponse } from '@/lib/validation';
import { sanitizeText, sanitizeUser } from '@/lib/sanitize';

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

  const rl = checkRateLimit(writeLimitKey(request, user), LIMITS.write.limit, LIMITS.write.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfter);

  const body = await request.json();
  const { ok, data, errors } = validate(profileUpdateSchema, body);
  if (!ok) return validationErrorResponse(errors);

  const { nombre, apellido, bio } = data;

  const result = await pool.query(
    `UPDATE users
     SET nombre   = $1,
         apellido = $2,
         bio      = $3
     WHERE id = $4
     RETURNING id, username, nombre, apellido, bio, avatar_url`,
    [
      sanitizeText(nombre),
      sanitizeText(apellido),
      bio ? sanitizeText(bio) : null,
      user.id,
    ]
  );

  if (!result.rows.length)
    return Response.json({ error: 'Usuario no encontrado' }, { status: 404 });

  return Response.json({ user: sanitizeUser(result.rows[0]) });
}
