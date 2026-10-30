import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { queryIGDB, coverUrl } from '@/lib/igdb';
import { checkRateLimit, getIp, rateLimitResponse, LIMITS, writeLimitKey } from '@/lib/rate-limit';
import { validate, listSchema, validationErrorResponse } from '@/lib/validation';
import { sanitizeText } from '@/lib/sanitize';

function getUser(request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(auth.slice(7), process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

export async function GET(request, { params }) {
  const { id } = await params;

  const ip = getIp(request);
  const rl = checkRateLimit(`read:${ip}`, LIMITS.read.limit, LIMITS.read.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfter);

  const user = getUser(request);

  const result = await pool.query(
    `SELECT l.id, l.title, l.description, l.is_public, l.followers_count,
            l.created_at, l.updated_at, l.user_id,
            u.username, u.nombre, u.apellido, u.avatar_url,
            ARRAY(
              SELECT lg.igdb_game_id FROM list_games lg
              WHERE lg.list_id = l.id
              ORDER BY lg.added_at ASC
            ) AS game_ids
     FROM lists l
     JOIN users u ON u.id = l.user_id
     WHERE l.id = $1`,
    [id]
  );

  if (!result.rows.length) {
    return Response.json({ error: 'Lista no encontrada' }, { status: 404 });
  }

  const list = result.rows[0];
  const gameIds = list.game_ids || [];

  let games = [];
  if (gameIds.length > 0) {
    try {
      const igdbGames = await queryIGDB(
        'games',
        `fields id,name,cover.image_id,rating;
         where id = (${gameIds.join(',')});
         limit 100;`
      );
      const gameMap = new Map(igdbGames.map((g) => [g.id, g]));
      games = gameIds
        .map((gid) => {
          const g = gameMap.get(gid);
          if (!g) return null;
          return {
            igdb_game_id: g.id,
            name: g.name,
            cover: g.cover?.image_id ? coverUrl(g.cover.image_id, 'cover_big') : null,
            rating: g.rating ? Math.round((g.rating / 20) * 10) / 10 : null,
          };
        })
        .filter(Boolean);
    } catch {
      // games stays empty
    }
  }

  let is_following = false;
  if (user) {
    const followCheck = await pool.query(
      'SELECT 1 FROM list_followers WHERE user_id = $1 AND list_id = $2',
      [user.id, id]
    );
    is_following = followCheck.rows.length > 0;
  }

  return Response.json({
    id: list.id,
    title: list.title,
    description: list.description,
    is_public: list.is_public,
    followers_count: list.followers_count,
    created_at: list.created_at,
    user_id: list.user_id,
    creator: {
      username: list.username,
      nombre: list.nombre,
      apellido: list.apellido,
      avatar_url: list.avatar_url,
    },
    games,
    games_count: games.length,
    is_following,
  });
}

export async function PUT(request, { params }) {
  const { id } = await params;
  const user = getUser(request);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const rl = checkRateLimit(writeLimitKey(request, user), LIMITS.write.limit, LIMITS.write.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfter);

  const ownerCheck = await pool.query('SELECT user_id FROM lists WHERE id = $1', [id]);
  if (!ownerCheck.rows.length) return Response.json({ error: 'Lista no encontrada' }, { status: 404 });
  if (ownerCheck.rows[0].user_id !== user.id) return Response.json({ error: 'Sin permisos' }, { status: 403 });

  const body = await request.json();
  const { ok, data, errors } = validate(listSchema.pick({ title: true, description: true }), body);
  if (!ok) return validationErrorResponse(errors);

  const result = await pool.query(
    `UPDATE lists SET title = $1, description = $2, updated_at = NOW()
     WHERE id = $3
     RETURNING id, title, description, updated_at`,
    [sanitizeText(data.title), data.description ? sanitizeText(data.description) : null, id]
  );

  return Response.json(result.rows[0]);
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const user = getUser(request);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const rl = checkRateLimit(writeLimitKey(request, user), LIMITS.write.limit, LIMITS.write.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfter);

  const ownerCheck = await pool.query('SELECT user_id FROM lists WHERE id = $1', [id]);
  if (!ownerCheck.rows.length) return Response.json({ error: 'Lista no encontrada' }, { status: 404 });
  if (ownerCheck.rows[0].user_id !== user.id) return Response.json({ error: 'Sin permisos' }, { status: 403 });

  await pool.query('DELETE FROM lists WHERE id = $1', [id]);

  return Response.json({ success: true });
}
