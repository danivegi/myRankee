import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { queryIGDB, coverUrl } from '@/lib/igdb';
import { ensureFollowsTable } from '@/lib/init-follows';
import { ensureCommentsTables } from '@/lib/comments';
import { parseDbDate } from '@/lib/dateUtils';

// ── Spanish relative time ─────────────────────────────────────────────────────

function timeAgo(date) {
  const diff = Date.now() - parseDbDate(date).getTime();
  const mins  = Math.floor(diff / 60_000);
  if (mins < 2)  return 'ahora mismo';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} hora${hours > 1 ? 's' : ''}`;
  const days = Math.floor(hours / 24);
  if (days < 7)  return `hace ${days} día${days > 1 ? 's' : ''}`;
  const weeks = Math.floor(days / 7);
  return `hace ${weeks} semana${weeks > 1 ? 's' : ''}`;
}

// Includes base WHERE so downstream queries extend with AND
const FEED_SELECT = `
  SELECT a.id, a.user_id, a.igdb_game_id, a.type, a.metadata, a.created_at,
         u.username, u.nombre, u.apellido, u.avatar_url,
         r.id                              AS review_id,
         COALESCE(lc.like_count, 0)::int  AS likes_count,
         COALESCE(r.comments_count, 0)::int AS comments_count
  FROM activity a
  JOIN users u ON u.id = a.user_id
  LEFT JOIN reviews r
    ON r.id = (a.metadata->>'review_id')::int
  LEFT JOIN (
    SELECT review_id, COUNT(*) AS like_count
    FROM review_likes
    GROUP BY review_id
  ) lc ON lc.review_id = r.id
  WHERE a.igdb_game_id IS NOT NULL
`;

export async function GET(request) {
  const tab = request.nextUrl.searchParams.get('tab') ?? 'reciente';

  // Extract optional viewer from auth header
  let viewerId = null;
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    try {
      viewerId = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET).id;
    } catch { /* invalid token — treat as unauthenticated */ }
  }

  try {
    await ensureFollowsTable();
    await ensureCommentsTables();

    // ── Activity feed ─────────────────────────────────────────────────────────
    let activityRows;
    let no_follows = false;

    if (tab === 'popular') {
      const res = await pool.query(
        `${FEED_SELECT}
         AND a.created_at > NOW() - INTERVAL '7 days'
         ORDER BY likes_count DESC, a.created_at DESC
         LIMIT 60`
      );
      activityRows = res.rows;

    } else if (tab === 'siguiendo' && viewerId) {
      const followCountRes = await pool.query(
        'SELECT COUNT(*)::int AS cnt FROM follows WHERE follower_id = $1',
        [viewerId]
      );
      no_follows = followCountRes.rows[0].cnt === 0;

      const res = await pool.query(
        `${FEED_SELECT}
         AND a.user_id IN (SELECT followed_id FROM follows WHERE follower_id = $1)
         ORDER BY a.created_at DESC
         LIMIT 60`,
        [viewerId]
      );
      activityRows = res.rows;

    } else {
      const res = await pool.query(
        `${FEED_SELECT}
         ORDER BY a.created_at DESC
         LIMIT 60`
      );
      activityRows = res.rows;
    }

    // ── Merge: same user + same game → one card ───────────────────────────────
    const mergeMap = new Map();
    for (const row of activityRows) {
      const key = `${row.user_id}:${row.igdb_game_id}`;
      if (!mergeMap.has(key)) {
        mergeMap.set(key, {
          ...row,
          types:       new Set([row.type]),
          score:       row.type === 'rating' ? row.metadata?.score   : null,
          content:     row.type === 'review' ? row.metadata?.content : null,
          status:      row.type === 'backlog' ? row.metadata?.status : null,
          review_id:      row.review_id ?? null,
          likes_count:    row.likes_count,
          comments_count: row.comments_count,
        });
      } else {
        const m = mergeMap.get(key);
        m.types.add(row.type);
        if (parseDbDate(row.created_at) > parseDbDate(m.created_at)) m.created_at = row.created_at;
        if (row.type === 'rating') m.score = row.metadata?.score;
        if (row.type === 'review') {
          m.content        = row.metadata?.content;
          m.review_id      = row.review_id ?? null;
          m.likes_count    = row.likes_count;
          m.comments_count = row.comments_count;
        }
        if (row.type === 'backlog') m.status = row.metadata?.status;
      }
    }

    const mergedRows = [...mergeMap.values()]
      .sort(tab === 'popular'
        ? (a, b) => b.likes_count - a.likes_count || parseDbDate(b.created_at) - parseDbDate(a.created_at)
        : (a, b) => parseDbDate(b.created_at) - parseDbDate(a.created_at)
      )
      .slice(0, 20);

    // ── Batch-fetch IGDB game data ────────────────────────────────────────────
    const gameIds = [...new Set(mergedRows.map((r) => r.igdb_game_id))];
    let gameMap = {};
    if (gameIds.length) {
      try {
        const games = await queryIGDB(
          'games',
          `fields id,name,cover.image_id; where id = (${gameIds.join(',')}); limit ${gameIds.length};`
        );
        for (const g of games ?? []) {
          gameMap[g.id] = {
            id:    g.id,
            name:  g.name,
            cover: g.cover?.image_id ? coverUrl(g.cover.image_id, 'cover_big') : null,
          };
        }
      } catch { /* non-fatal */ }
    }

    // ── Build final items ─────────────────────────────────────────────────────
    const items = mergedRows.map((row) => {
      const types = row.types;
      let action;
      if (types.has('rating') && types.has('review')) action = 'valoró y reseñó un juego';
      else if (types.has('rating'))                    action = 'puntuó un juego';
      else if (types.has('review'))                    action = 'escribió una reseña';
      else                                             action = 'añadió a su lista';

      return {
        id:          row.id,
        type:        types.size > 1 ? 'combined' : [...types][0],
        action,
        metadata: {
          score:   row.score   ?? null,
          content: row.content ?? null,
          status:  row.status  ?? null,
        },
        created_at:  row.created_at,
        time_ago:    timeAgo(row.created_at),
        likes_count:    row.likes_count,
        comments_count: row.comments_count ?? 0,
        review_id:      row.review_id ?? null,
        user: {
          username:   row.username,
          nombre:     row.nombre,
          apellido:   row.apellido,
          avatar_url: row.avatar_url,
          initials:   row.nombre.charAt(0).toUpperCase() + (row.apellido?.charAt(0).toUpperCase() ?? ''),
        },
        game: gameMap[row.igdb_game_id] ?? { id: row.igdb_game_id, name: `Juego #${row.igdb_game_id}`, cover: null },
      };
    });

    // ── Trending: top 5 most-rated games this week ────────────────────────────
    // Uses `ratings` (canonical, 1 row per user/game) so re-ratings don't inflate counts.
    const trendingRes = await pool.query(
      `SELECT igdb_game_id, COUNT(*) AS cnt
       FROM ratings
       WHERE updated_at > NOW() - INTERVAL '7 days'
       GROUP BY igdb_game_id
       ORDER BY cnt DESC
       LIMIT 5`
    );

    const trendingIds = trendingRes.rows.map((r) => r.igdb_game_id);
    let trendingMap = {};
    if (trendingIds.length) {
      try {
        const games = await queryIGDB(
          'games',
          `fields id,name; where id = (${trendingIds.join(',')}); limit 5;`
        );
        for (const g of games ?? []) trendingMap[g.id] = g.name;
      } catch { /* non-fatal */ }
    }

    const trending = trendingRes.rows.map((r, i) => ({
      rank:    i + 1,
      igdb_id: r.igdb_game_id,
      title:   trendingMap[r.igdb_game_id] ?? `Juego #${r.igdb_game_id}`,
      count:   parseInt(r.cnt),
    }));

    // ── Suggestions: users not yet followed, ordered by review count ──────────
    const suggestionsRes = viewerId
      ? await pool.query(
          `SELECT u.id, u.username, u.nombre, u.apellido, u.avatar_url,
                  COUNT(r.id)::int AS review_count
           FROM users u
           LEFT JOIN reviews r ON r.user_id = u.id
           WHERE u.id != $1
             AND NOT EXISTS (SELECT 1 FROM follows WHERE follower_id = $1 AND followed_id = u.id)
           GROUP BY u.id
           ORDER BY review_count DESC
           LIMIT 5`,
          [viewerId]
        )
      : await pool.query(
          `SELECT u.id, u.username, u.nombre, u.apellido, u.avatar_url,
                  COUNT(r.id)::int AS review_count
           FROM users u
           LEFT JOIN reviews r ON r.user_id = u.id
           GROUP BY u.id
           ORDER BY review_count DESC
           LIMIT 5`
        );

    const suggestions = suggestionsRes.rows.map((u) => ({
      id:           u.id,
      username:     u.username,
      nombre:       u.nombre,
      apellido:     u.apellido,
      avatar_url:   u.avatar_url,
      initials:     u.nombre.charAt(0).toUpperCase() + (u.apellido?.charAt(0).toUpperCase() ?? ''),
      review_count: u.review_count,
    }));

    return Response.json({ items, trending, suggestions, no_follows });

  } catch (err) {
    console.error('[feed] error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
