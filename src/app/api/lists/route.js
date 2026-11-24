import { optionalUser, requireUser } from '@/lib/auth';
import pool from '@/lib/db';
import { queryIGDB, coverUrl } from '@/lib/igdb';
import { checkAndUnlockAchievements } from '@/lib/achievements';
import { blockedIdsFor } from '@/lib/blocks';
import { checkRateLimit, getIp, rateLimitResponse, LIMITS, writeLimitKey } from '@/lib/rate-limit';
import { validate, listSchema, validationErrorResponse } from '@/lib/validation';
import { sanitizeText } from '@/lib/sanitize';

export async function GET(request) {
  const ip = getIp(request);
  const rl = checkRateLimit(`read:${ip}`, LIMITS.read.limit, LIMITS.read.windowMs);
  if (!rl.success) return rateLimitResponse(rl.retryAfter);

  const { searchParams } = request.nextUrl;
  const tab = searchParams.get('tab') || 'populares';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = 12;
  const offset = (page - 1) * limit;
  // Lists of users the viewer blocked are left out (optional token).
  const hidden = await blockedIdsFor((await optionalUser(request))?.id ?? null);

  // Every order ends in l.id so offset pages are stable (no repeats or gaps between pages).
  const withGames = ' AND EXISTS (SELECT 1 FROM list_games e WHERE e.list_id = l.id)';
  let extraWhere = '';
  let extraColumns = '';
  let orderBy;

  if (tab === 'mas_seguidas') {
    // Most followed public lists of all time, most recently updated first on ties; empty lists left out.
    extraWhere = withGames;
    orderBy = 'l.followers_count DESC, COALESCE(l.updated_at, l.created_at) DESC, l.id DESC';
  } else if (tab === 'recientes') {
    orderBy = 'l.created_at DESC, l.id DESC';
  } else {
    // "populares" = "En tendencia" (key kept for existing clients): follows gained in the last 7 days,
    // then all-time followers, then most recently updated. Lists without recent follows still follow,
    // so the tab is never empty. Empty lists are left out.
    extraWhere = withGames;
    extraColumns = `,
            (SELECT COUNT(*)::int FROM list_followers rf
              WHERE rf.list_id = l.id AND rf.created_at > NOW() - INTERVAL '7 days') AS recent_followers`;
    orderBy = 'recent_followers DESC, l.followers_count DESC, COALESCE(l.updated_at, l.created_at) DESC, l.id DESC';
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
            ) AS cover_game_ids${extraColumns}
     FROM lists l
     JOIN users u ON u.id = l.user_id
     LEFT JOIN list_games lg ON lg.list_id = l.id
     WHERE l.is_public = true${extraWhere}
       AND l.user_id <> ALL($3::int[])
     GROUP BY l.id, u.username, u.nombre, u.apellido, u.avatar_url
     ORDER BY ${orderBy}
     LIMIT $1 OFFSET $2`,
    // One extra row tells whether there's a next page.
    [limit + 1, offset, hidden]
  );
  const hasMore = result.rows.length > limit;
  const pageRows = result.rows.slice(0, limit);

  const lists = await Promise.all(
    pageRows.map(async (list) => {
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
        // En tendencia only: follows gained in the last 7 days.
        ...(list.recent_followers != null ? { recent_followers: list.recent_followers } : {}),
      };
    })
  );

  return Response.json({ lists, page, hasMore });
}

export async function POST(request) {
  const session = await requireUser(request);
  if (session.response) return session.response;
  const user = session.user;

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
