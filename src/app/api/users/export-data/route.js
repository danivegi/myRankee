import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { checkRateLimit, getIp, rateLimitResponse } from '@/lib/rate-limit';

function getUser(request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try { return jwt.verify(auth.slice(7), process.env.JWT_SECRET); }
  catch { return null; }
}

export async function GET(request) {
  const user = getUser(request);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const ip = getIp(request);
  const rl = checkRateLimit(`export:${ip}`, 5, 60_000 * 60);
  if (!rl.success) return rateLimitResponse(rl.retryAfter);

  const uid = user.id;

  const [
    profileRes, ratingsRes, reviewsRes, listsRes,
    backlogRes, commentsRes, achievementsRes,
    followersRes, followingRes,
    favGamesRes, favTopRes,
    socialLinksRes, notifPrefsRes,
  ] = await Promise.all([
    pool.query(
      `SELECT username, nombre, apellido, email, bio, avatar_url, created_at, terms_accepted_at
       FROM users WHERE id = $1`, [uid]
    ),
    pool.query('SELECT igdb_game_id, score, created_at FROM ratings WHERE user_id = $1 ORDER BY created_at DESC', [uid]),
    pool.query('SELECT igdb_game_id, content, created_at, updated_at FROM reviews WHERE user_id = $1 ORDER BY created_at DESC', [uid]),
    pool.query('SELECT id, title, description, is_public, created_at FROM lists WHERE user_id = $1 ORDER BY created_at DESC', [uid]),
    pool.query('SELECT igdb_game_id, status, updated_at FROM backlog WHERE user_id = $1 ORDER BY updated_at DESC', [uid]),
    pool.query(
      `SELECT r.igdb_game_id, c.content, c.created_at
       FROM review_comments c JOIN reviews r ON r.id = c.review_id
       WHERE c.user_id = $1 ORDER BY c.created_at DESC`, [uid]
    ),
    pool.query(
      `SELECT a.code, a.title, a.tier, ua.unlocked_at
       FROM user_achievements ua JOIN achievements a ON a.id = ua.achievement_id
       WHERE ua.user_id = $1 ORDER BY ua.unlocked_at DESC`, [uid]
    ),
    pool.query(
      `SELECT u.username FROM follows f JOIN users u ON u.id = f.follower_id
       WHERE f.followed_id = $1`, [uid]
    ),
    pool.query(
      `SELECT u.username FROM follows f JOIN users u ON u.id = f.followed_id
       WHERE f.follower_id = $1`, [uid]
    ),
    pool.query('SELECT igdb_game_id, created_at FROM favorite_games WHERE user_id = $1 ORDER BY created_at DESC', [uid]),
    pool.query('SELECT igdb_game_id, position FROM favorite_games_top WHERE user_id = $1 ORDER BY position ASC', [uid]),
    pool.query('SELECT platform, url FROM user_social_links WHERE user_id = $1 ORDER BY platform', [uid]),
    pool.query('SELECT preferences FROM user_notification_preferences WHERE user_id = $1', [uid]),
  ]);

  // Attach games to each list
  const listIds = listsRes.rows.map((l) => l.id);
  let listGames = {};
  if (listIds.length) {
    const gamesRes = await pool.query(
      'SELECT list_id, igdb_game_id, added_at FROM list_games WHERE list_id = ANY($1) ORDER BY added_at DESC',
      [listIds]
    );
    for (const row of gamesRes.rows) {
      (listGames[row.list_id] ??= []).push({ igdb_game_id: row.igdb_game_id, added_at: row.added_at });
    }
  }

  const payload = {
    exported_at: new Date().toISOString(),
    profile: profileRes.rows[0] ?? null,
    ratings: ratingsRes.rows,
    reviews: reviewsRes.rows,
    lists: listsRes.rows.map((l) => ({ ...l, games: listGames[l.id] ?? [] })),
    backlog: backlogRes.rows,
    comments: commentsRes.rows,
    achievements: achievementsRes.rows,
    followers: followersRes.rows.map((r) => r.username),
    following: followingRes.rows.map((r) => r.username),
    favorite_games: favGamesRes.rows,
    favorite_games_top: favTopRes.rows,
    social_links: socialLinksRes.rows,
    notification_preferences: notifPrefsRes.rows[0]?.preferences ?? null,
  };

  const username = profileRes.rows[0]?.username ?? uid;
  const date = new Date().toISOString().slice(0, 10);
  const filename = `myrankee-${username}-${date}.json`;

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
