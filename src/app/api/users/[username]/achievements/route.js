import { optionalUser } from '@/lib/auth';
import pool from '@/lib/db';
import { ensureAchievementsTable } from '@/lib/achievements';

export async function GET(request, { params }) {
  const { username } = await params;

  const viewerId = (await optionalUser(request))?.id ?? null;

  const userRes = await pool.query('SELECT id FROM users WHERE lower(username) = lower($1)', [username]);
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

    // Read-only: achievements are unlocked by the actions that earn them (checkAndUnlockAchievements
    // after rating, reviewing, backlog, creating a list, receiving a like or a follow).

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
