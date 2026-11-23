import { optionalUser } from '@/lib/auth';
import { blockedIdsFor, ensureBlocksTable } from '@/lib/blocks';
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

// One page = PAGE_SIZE cards. A card is everything one user did on one game (rating + review +
// backlog), placed at its latest activity.
const PAGE_SIZE = 20;

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

// ── Cursor (opaque to clients) ────────────────────────────────────────────────
// reciente / siguiendo: keyset { t: latest activity time (Postgres text, full precision), id }.
// popular: { o: offset } (its order depends on like counts, which keep changing).

function encodeCursor(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function decodeCursor(raw, tab) {
  try {
    const c = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (tab === 'popular') return Number.isInteger(c?.o) && c.o > 0 ? c : null;
    return typeof c?.t === 'string' && c.t.length <= 40 && Number.isInteger(c?.id) ? c : null;
  } catch {
    return null;
  }
}

/**
 * The page's cards: [{ user_id, igdb_game_id, last_at_text, last_id }] in feed order, PAGE_SIZE + 1
 * of them (the extra one only tells whether there's a next page).
 */
async function pageCards({ tab, viewerId, hidden, cursor }) {
  const params = [hidden];
  const where  = ['a.igdb_game_id IS NOT NULL', 'a.user_id <> ALL($1::int[])'];
  let having = '';
  let order;
  let offset = '';
  let likesJoin = '';
  let likesCol = '';

  if (tab === 'popular') {
    where.push(`a.created_at > NOW() - INTERVAL '7 days'`);
    likesJoin = `
      LEFT JOIN reviews r ON r.id = (a.metadata->>'review_id')::int
      LEFT JOIN (SELECT review_id, COUNT(*) AS like_count FROM review_likes GROUP BY review_id) lc
        ON lc.review_id = r.id`;
    likesCol = ', MAX(COALESCE(lc.like_count, 0))::int AS card_likes';
    order = 'card_likes DESC, MAX(a.created_at) DESC, MAX(a.id) DESC';
    if (cursor) offset = `OFFSET ${cursor.o}`;
  } else {
    if (tab === 'siguiendo') {
      params.push(viewerId);
      where.push(`a.user_id IN (SELECT followed_id FROM follows WHERE follower_id = $${params.length})`);
    }
    order = 'MAX(a.created_at) DESC, MAX(a.id) DESC';
    if (cursor) {
      params.push(cursor.t, cursor.id);
      const t = `$${params.length - 1}`;
      const id = `$${params.length}`;
      having = `HAVING MAX(a.created_at) < ${t} OR (MAX(a.created_at) = ${t} AND MAX(a.id) < ${id})`;
    }
  }

  const res = await pool.query(
    `SELECT a.user_id, a.igdb_game_id,
            MAX(a.created_at)::text AS last_at_text,
            MAX(a.id)               AS last_id
            ${likesCol}
     FROM activity a
     JOIN users u ON u.id = a.user_id
     ${likesJoin}
     WHERE ${where.join(' AND ')}
     GROUP BY a.user_id, a.igdb_game_id
     ${having}
     ORDER BY ${order}
     LIMIT ${PAGE_SIZE + 1} ${offset}`,
    params
  );
  return res.rows;
}

export async function GET(request) {
  const sp  = request.nextUrl.searchParams;
  const tab = sp.get('tab') ?? 'reciente';

  // Optional viewer (a dead token counts as signed out).
  const viewerId = (await optionalUser(request))?.id ?? null;

  // Without a viewer, "siguiendo" is the "reciente" feed (as before).
  const feedTab = tab === 'popular' ? 'popular' : tab === 'siguiendo' && viewerId ? 'siguiendo' : 'reciente';

  const rawCursor = sp.get('cursor');
  const cursor = rawCursor ? decodeCursor(rawCursor, feedTab) : null;
  if (rawCursor && !cursor) return Response.json({ error: 'Cursor inválido' }, { status: 400 });
  const firstPage = !cursor;

  try {
    await ensureFollowsTable();
    await ensureCommentsTables();
    await ensureBlocksTable();
    const hidden = await blockedIdsFor(viewerId);

    let no_follows = false;
    if (feedTab === 'siguiendo') {
      const followCountRes = await pool.query(
        'SELECT COUNT(*)::int AS cnt FROM follows WHERE follower_id = $1',
        [viewerId]
      );
      no_follows = followCountRes.rows[0].cnt === 0;
    }

    // ── This page's cards, then every activity row behind them ────────────────
    const cardRows = await pageCards({ tab: feedTab, viewerId, hidden, cursor });
    const has_more = cardRows.length > PAGE_SIZE;
    const cards = cardRows.slice(0, PAGE_SIZE);

    let activityRows = [];
    if (cards.length) {
      const res = await pool.query(
        `${FEED_SELECT}
         AND (a.user_id, a.igdb_game_id) IN (SELECT * FROM unnest($1::int[], $2::int[]))
         ${feedTab === 'popular' ? `AND a.created_at > NOW() - INTERVAL '7 days'` : ''}
         ORDER BY a.created_at DESC, a.id DESC`,
        [cards.map((c) => c.user_id), cards.map((c) => c.igdb_game_id)]
      );
      activityRows = res.rows;
    }

    // ── Merge: same user + same game → one card (rows come newest first) ─────
    // Each field comes from the newest row of its type (a re-rating shows the current score).
    const mergeMap = new Map();
    for (const row of activityRows) {
      const key = `${row.user_id}:${row.igdb_game_id}`;
      let m = mergeMap.get(key);
      if (!m) {
        m = {
          ...row,
          types:          new Set(),
          score:          null,
          content:        null,
          status:         null,
          review_id:      null,
          likes_count:    0,
          comments_count: 0,
        };
        mergeMap.set(key, m);
      }
      if (m.types.has(row.type)) continue;
      m.types.add(row.type);
      if (row.type === 'rating')  m.score = row.metadata?.score ?? null;
      if (row.type === 'backlog') m.status = row.metadata?.status ?? null;
      if (row.type === 'review') {
        m.content        = row.metadata?.content ?? null;
        m.review_id      = row.review_id ?? null;
        m.likes_count    = row.likes_count;
        m.comments_count = row.comments_count;
      }
    }

    // Feed order = the page query's order.
    const mergedRows = cards
      .map((c) => mergeMap.get(`${c.user_id}:${c.igdb_game_id}`))
      .filter(Boolean);

    const last = cards[cards.length - 1];
    const next_cursor = !has_more || !last
      ? null
      : feedTab === 'popular'
        ? encodeCursor({ o: (cursor?.o ?? 0) + PAGE_SIZE })
        : encodeCursor({ t: last.last_at_text, id: Number(last.last_id) });

    // ── Which of these reviews the viewer already liked ───────────────────────
    const reviewIds = mergedRows.map((r) => r.review_id).filter((id) => id != null);
    let likedByViewer = new Set();
    if (viewerId && reviewIds.length) {
      const likedRes = await pool.query(
        'SELECT review_id FROM review_likes WHERE user_id = $1 AND review_id = ANY($2::int[])',
        [viewerId, reviewIds]
      );
      likedByViewer = new Set(likedRes.rows.map((r) => r.review_id));
    }

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
        // Whether the signed-in viewer liked this review (always false without a token or a review).
        viewer_liked:   row.review_id != null && likedByViewer.has(row.review_id),
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

    if (!firstPage) {
      return Response.json({ items, trending: [], suggestions: [], no_follows, has_more, next_cursor });
    }

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
             -- Never suggest someone you can't follow (blocked either way).
             AND NOT EXISTS (
               SELECT 1 FROM user_blocks b
               WHERE (b.blocker_id = $1 AND b.blocked_id = u.id) OR (b.blocker_id = u.id AND b.blocked_id = $1)
             )
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

    return Response.json({ items, trending, suggestions, no_follows, has_more, next_cursor });

  } catch (err) {
    console.error('[feed] error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
