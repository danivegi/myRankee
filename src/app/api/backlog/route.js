import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { checkAndUnlockAchievements } from '@/lib/achievements';
import { checkRateLimit, getIp, rateLimitResponse, LIMITS } from '@/lib/rate-limit';

const VALID_STATUSES = ['jugado', 'jugando', 'pendiente'];

function getUser(request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(auth.slice(7), process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

export async function GET(request) {
  const user = getUser(request);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const status = request.nextUrl.searchParams.get('status');
  const params = [user.id];
  let where = 'WHERE user_id = $1';

  if (status && VALID_STATUSES.includes(status)) {
    where += ' AND status = $2';
    params.push(status);
  }

  const result = await pool.query(
    `SELECT * FROM backlog ${where} ORDER BY updated_at DESC`,
    params
  );

  return Response.json(result.rows);
}

export async function POST(request) {
  const user = getUser(request);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const ip = getIp(request);
  const rl = checkRateLimit(`write:${ip}`, LIMITS.write.limit, LIMITS.write.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfter);

  const { igdb_game_id, status } = await request.json();

  if (!igdb_game_id || !status)
    return Response.json({ error: 'Faltan campos obligatorios' }, { status: 400 });

  if (!VALID_STATUSES.includes(status))
    return Response.json({ error: 'Estado inválido (jugado/jugando/pendiente)' }, { status: 400 });

  const result = await pool.query(
    `INSERT INTO backlog (user_id, igdb_game_id, status)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, igdb_game_id)
     DO UPDATE SET status = EXCLUDED.status, updated_at = NOW()
     RETURNING *`,
    [user.id, igdb_game_id, status]
  );

  // Log activity (fire-and-forget)
  pool.query(
    `INSERT INTO activity (user_id, igdb_game_id, type, metadata)
     VALUES ($1, $2, 'backlog', $3::jsonb)`,
    [user.id, igdb_game_id, JSON.stringify({ status })]
  ).catch(() => {});

  const newAchievements = await checkAndUnlockAchievements(user.id);

  return Response.json({ entry: result.rows[0], new_achievements: newAchievements });
}

export async function DELETE(request) {
  const user = getUser(request);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { igdb_game_id } = await request.json();
  if (!igdb_game_id)
    return Response.json({ error: 'Falta igdb_game_id' }, { status: 400 });

  await pool.query(
    'DELETE FROM backlog WHERE user_id = $1 AND igdb_game_id = $2',
    [user.id, igdb_game_id]
  );

  return Response.json({ success: true });
}
