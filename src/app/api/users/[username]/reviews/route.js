import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { queryIGDB, coverUrl } from '@/lib/igdb';
import { translateGenre } from '@/lib/translations';

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
  const { username } = await params;

  const viewer = getUser(request);
  const viewerUserId = viewer?.id ?? null;

  // Get the user id
  const userResult = await pool.query(
    'SELECT id FROM users WHERE username = $1',
    [username]
  );

  if (!userResult.rows.length)
    return Response.json({ error: 'Usuario no encontrado' }, { status: 404 });

  const userId = userResult.rows[0].id;

  // Get all reviews + their associated rating (if any)
  const reviewsResult = await pool.query(
    `SELECT r.id, r.igdb_game_id, r.content, r.created_at,
            rat.score,
            COALESCE(lc.like_count, 0)::int AS likes_count,
            COALESCE(r.comments_count, 0)::int AS comments_count,
            (ul.review_id IS NOT NULL) AS viewer_liked
     FROM reviews r
     LEFT JOIN ratings rat
       ON rat.user_id = r.user_id AND rat.igdb_game_id = r.igdb_game_id
     LEFT JOIN (
       SELECT review_id, COUNT(*) AS like_count
       FROM review_likes GROUP BY review_id
     ) lc ON lc.review_id = r.id
     LEFT JOIN review_likes ul ON ul.review_id = r.id AND ul.user_id = $2
     WHERE r.user_id = $1
     ORDER BY r.created_at DESC`,
    [userId, viewerUserId]
  );

  const reviews = reviewsResult.rows;
  if (!reviews.length) return Response.json([]);

  // Batch fetch game info from IGDB
  const ids = reviews.map((r) => r.igdb_game_id).join(',');
  let gameMap = {};
  try {
    const games = await queryIGDB(
      'games',
      `fields id,name,cover.image_id,genres.name; where id = (${ids}); limit ${reviews.length};`
    );
    for (const g of games ?? []) {
      gameMap[g.id] = {
        name:  g.name,
        cover: g.cover?.image_id ? coverUrl(g.cover.image_id, 'cover_big') : null,
        genre: g.genres?.[0]?.name ? translateGenre(g.genres[0].name) : null,
      };
    }
  } catch {
    // gameMap stays empty
  }

  const enriched = reviews.map((r) => ({
    id:             r.id,
    igdb_game_id:   r.igdb_game_id,
    content:        r.content,
    created_at:     r.created_at,
    score:          r.score,
    likes_count:    r.likes_count,
    comments_count: r.comments_count,
    viewer_liked:   r.viewer_liked,
    name:           gameMap[r.igdb_game_id]?.name  ?? null,
    cover:          gameMap[r.igdb_game_id]?.cover ?? null,
    genre:          gameMap[r.igdb_game_id]?.genre ?? null,
  }));

  return Response.json(enriched);
}
