import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { queryIGDB, coverUrl } from '@/lib/igdb';
import { checkAndUnlockAchievements } from '@/lib/achievements';
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

export async function GET(request) {
  const ip = getIp(request);
  const rl = checkRateLimit(`read:${ip}`, LIMITS.read.limit, LIMITS.read.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfter);

  const { searchParams } = request.nextUrl;
  const tab = searchParams.get('tab') || 'populares';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = 12;
  const offset = (page - 1) * limit;

  let extraWhere = '';
  let orderBy;

  if (tab === 'mas_seguidas') {
    extraWhere = " AND l.created_at > NOW() - INTERVAL '7 days'";
    orderBy = 'l.followers_count DESC, l.created_at DESC';
  } else if (tab === 'recientes') {
    orderBy = 'l.created_at DESC';
  } else {
    orderBy = 'l.followers_count DESC, l.created_at DESC';
  }

  const result = await pool.query(
    `SELECT l.id, l.title, l.description, l.followers_count, l.created_at,
            u.username, u.nombre, u.apellido, u.avatar_url,
            COUNT(lg.id)::int AS games_count,
            ARRAY(
              SELECT lg2.igdb_game_id FROM list_games lg2
              WHERE lg2.list_id = l.id
              ORDER BY lg2.added_at ASC
              LIMIT 4
            ) AS cover_game_ids
     FROM lists l
     JOIN users u ON u.id = l.user_id
     LEFT JOIN list_games lg ON lg.list_id = l.id
     WHERE l.is_public = true${extraWhere}
     GROUP BY l.id, u.username, u.nombre, u.apellido, u.avatar_url
     ORDER BY ${orderBy}
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  const lists = await Promise.all(
    result.rows.map(async (list) => {
      const gameIds = list.cover_game_ids || [];
      let covers = [];

      if (gameIds.length > 0) {
        try {
          const games = await queryIGDB(
            'games',
            `fields id,cover.image_id;
             where id = (${gameIds.join(',')});
             limit 4;`
          );
          covers = games
            .filter((g) => g.cover?.image_id)
            .map((g) => coverUrl(g.cover.image_id, '720p'));
        } catch {
          // covers stays empty
        }
      }

      return {
        id: list.id,
        title: list.title,
        description: list.description,
        followers_count: list.followers_count,
        games_count: list.games_count,
        created_at: list.created_at,
        creator: {
          username: list.username,
          nombre: list.nombre,
          apellido: list.apellido,
          avatar_url: list.avatar_url,
        },
        covers,
      };
    })
  );

  return Response.json({ lists, page, hasMore: result.rows.length === limit });
}

export async function POST(request) {
  const user = getUser(request);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const rl = checkRateLimit(writeLimitKey(request, user), LIMITS.write.limit, LIMITS.write.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfter);

  const body = await request.json();
  const { ok, data, errors } = validate(listSchema, body);
  if (!ok) return validationErrorResponse(errors);

  const { title, description, is_public = true } = data;

  const result = await pool.query(
    `INSERT INTO lists (user_id, title, description, is_public)
     VALUES ($1, $2, $3, $4)
     RETURNING id, title, description, is_public, created_at`,
    [user.id, sanitizeText(title), description ? sanitizeText(description) : null, is_public]
  );

  checkAndUnlockAchievements(user.id).catch(() => {});

  return Response.json(result.rows[0], { status: 201 });
}
