import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { checkAndUnlockAchievements } from '@/lib/achievements';
import { checkRateLimit, rateLimitResponse, LIMITS, writeLimitKey } from '@/lib/rate-limit';

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
  if (!user) return Response.json({ score: null });

  const igdb_game_id = request.nextUrl.searchParams.get('igdb_game_id');
  if (!igdb_game_id) return Response.json({ score: null });

  const result = await pool.query(
    'SELECT score FROM ratings WHERE user_id = $1 AND igdb_game_id = $2',
    [user.id, parseInt(igdb_game_id, 10)]
  );
  return Response.json({ score: result.rows[0]?.score ?? null });
}

export async function POST(request) {
  const user = getUser(request);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const rl = checkRateLimit(writeLimitKey(request, user), LIMITS.write.limit, LIMITS.write.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfter);

  const { igdb_game_id, score } = await request.json();

  if (igdb_game_id == null || score == null)
    return Response.json({ error: 'Faltan campos obligatorios' }, { status: 400 });

  const s = parseFloat(score);
  if (isNaN(s) || s < 0 || s > 5 || (s * 2) % 1 !== 0)
    return Response.json({ error: 'Puntuación inválida (0–5 en pasos de 0.5)' }, { status: 400 });

  const result = await pool.query(
    `INSERT INTO ratings (user_id, igdb_game_id, score)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, igdb_game_id)
     DO UPDATE SET score = EXCLUDED.score, updated_at = NOW()
     RETURNING *`,
    [user.id, igdb_game_id, s]
  );

  // Log activity (fire-and-forget)
  pool.query(
    `INSERT INTO activity (user_id, igdb_game_id, type, metadata)
     VALUES ($1, $2, 'rating', $3::jsonb)`,
    [user.id, igdb_game_id, JSON.stringify({ score: s })]
  ).catch(() => {});

  const newAchievements = await checkAndUnlockAchievements(user.id);

  return Response.json({ rating: result.rows[0], new_achievements: newAchievements });
}
