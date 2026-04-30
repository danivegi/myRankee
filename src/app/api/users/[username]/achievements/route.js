import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { ensureAchievementsTable } from '@/lib/achievements';

export async function GET(request, { params }) {
  const { username } = await params;

  const auth = request.headers.get('authorization');
  let viewerId = null;
  if (auth?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
      viewerId = payload.id;
    } catch { /* unauthenticated */ }
  }

  const userRes = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
  if (!userRes.rows.length) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 });
  const targetId = userRes.rows[0].id;
  const isOwner = viewerId === targetId;

  try {
    await ensureAchievementsTable();

    const [allAch, unlockedRes, ratRes, revRes, folRes, listRes, likeRes, backRes] = await Promise.all([
      pool.query(
        `SELECT id, code, title, description, tier, requirement_type, requirement_value, is_secret
         FROM achievements
         ORDER BY requirement_type, requirement_value ASC`
      ),
      pool.query(
        `SELECT a.code, ua.unlocked_at
         FROM user_achievements ua
         JOIN achievements a ON a.id = ua.achievement_id
         WHERE ua.user_id = $1`,
        [targetId]
      ),
      pool.query('SELECT COUNT(*)::int AS cnt FROM ratings WHERE user_id = $1', [targetId]),
      pool.query('SELECT COUNT(*)::int AS cnt FROM reviews WHERE user_id = $1', [targetId]),
      pool.query('SELECT COUNT(*)::int AS cnt FROM follows WHERE followed_id = $1', [targetId]),
      pool.query('SELECT COUNT(*)::int AS cnt FROM lists WHERE user_id = $1', [targetId]),
      pool.query(
        `SELECT COUNT(*)::int AS cnt FROM review_likes rl
         JOIN reviews r ON r.id = rl.review_id WHERE r.user_id = $1`,
        [targetId]
      ),
      pool.query('SELECT COUNT(*)::int AS cnt FROM backlog WHERE user_id = $1', [targetId]),
    ]);

    const counts = {
      ratings_count:   ratRes.rows[0].cnt,
      reviews_count:   revRes.rows[0].cnt,
      followers_count: folRes.rows[0].cnt,
      lists_count:     listRes.rows[0].cnt,
      received_likes:  likeRes.rows[0].cnt,
      backlog_count:   backRes.rows[0].cnt,
    };

    const unlockedMap = {};
    for (const r of unlockedRes.rows) unlockedMap[r.code] = r.unlocked_at;

    // Auto-unlock any achievements that have reached their threshold but
    // weren't recorded yet (e.g. first load after deployments, manual DB seeding)
    const toAutoUnlock = allAch.rows.filter(
      (a) => !unlockedMap[a.code] && (counts[a.requirement_type] ?? 0) >= a.requirement_value
    );
    if (toAutoUnlock.length > 0) {
      const now = new Date().toISOString();
      await Promise.all(
        toAutoUnlock.map((a) =>
          pool.query(
            `INSERT INTO user_achievements (user_id, achievement_id)
             VALUES ($1, $2) ON CONFLICT (user_id, achievement_id) DO NOTHING`,
            [targetId, a.id]
          ).catch(() => {})
        )
      );
      for (const a of toAutoUnlock) unlockedMap[a.code] = now;
    }

    const achievements = allAch.rows.map((a) => {
      const unlocked = !!unlockedMap[a.code];
      const isHidden = a.is_secret && !unlocked && !isOwner;
      return {
        id:                a.id,
        key:               a.code,
        title:             isHidden ? '???' : a.title,
        description:       isHidden ? 'Logro secreto' : a.description,
        tier:              a.tier,
        requirement_type:  a.requirement_type,
        requirement_value: a.requirement_value,
        is_secret:         a.is_secret,
        unlocked,
        unlocked_at:       unlockedMap[a.code] ?? null,
        progress:          isOwner ? Math.min(counts[a.requirement_type] ?? 0, a.requirement_value) : null,
      };
    });

    return Response.json({ achievements, counts: isOwner ? counts : null });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
