import { requireUser } from '@/lib/auth';
import pool from '@/lib/db';

const DEFAULTS = {
  comments_on_reviews: true,
  new_followers:       true,
  follows_back:        true,
  review_likes:        true,
  list_likes:          true,
};

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_notification_preferences (
      user_id     INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      preferences JSONB   NOT NULL DEFAULT '{}',
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

export async function GET(request) {
  const session = await requireUser(request);
  if (session.response) return session.response;
  const user = session.user;

  await ensureTable();

  const res = await pool.query(
    'SELECT preferences FROM user_notification_preferences WHERE user_id = $1',
    [user.id],
  );

  const stored = res.rows[0]?.preferences ?? {};
  const prefs  = { ...DEFAULTS, ...stored };

  return Response.json({ preferences: prefs });
}

export async function PUT(request) {
  const session = await requireUser(request);
  if (session.response) return session.response;
  const user = session.user;

  await ensureTable();

  const body = await request.json().catch(() => ({}));

  // Only allow known keys
  const prefs = {};
  for (const key of Object.keys(DEFAULTS)) {
    if (typeof body[key] === 'boolean') prefs[key] = body[key];
  }

  await pool.query(`
    INSERT INTO user_notification_preferences (user_id, preferences, updated_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (user_id) DO UPDATE
      SET preferences = $2, updated_at = NOW()
  `, [user.id, JSON.stringify(prefs)]);

  return Response.json({ preferences: { ...DEFAULTS, ...prefs } });
}
