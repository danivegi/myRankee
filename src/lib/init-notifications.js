import pool from './db';

const DEFAULT_PREFERENCES = {
  review_likes:        true,
  comments_on_reviews: true,
  new_followers:       true,
  follows_back:        true,
  list_likes:          true,
};

export async function ensureNotificationPreferencesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_notification_preferences (
      user_id     INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      preferences JSONB   NOT NULL DEFAULT '{}',
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

export async function createDefaultNotificationPreferences(userId) {
  await ensureNotificationPreferencesTable();
  await pool.query(`
    INSERT INTO user_notification_preferences (user_id, preferences, updated_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (user_id) DO NOTHING
  `, [userId, JSON.stringify(DEFAULT_PREFERENCES)]);
}

export async function ensureNotificationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id           SERIAL      PRIMARY KEY,
      user_id      INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      from_user_id INTEGER     REFERENCES users(id) ON DELETE CASCADE,
      type         VARCHAR(50) NOT NULL,
      read         BOOLEAN     NOT NULL DEFAULT FALSE,
      entity_id    INTEGER,
      entity_name  TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

const SYSTEM_TYPES = new Set(['warning', 'content_deleted', 'suspended', 'report_reviewed']);

const PREF_KEY = {
  like:    'review_likes',
  comment: 'comments_on_reviews',
  follow:  'new_followers',
};

export async function createNotification({ userId, fromUserId, type, entityId = null, entityName = null }) {
  if (userId === fromUserId) return;

  if (!SYSTEM_TYPES.has(type)) {
    const prefKey = PREF_KEY[type];
    if (prefKey) {
      const { rows } = await pool.query(
        `SELECT preferences FROM user_notification_preferences WHERE user_id = $1`,
        [userId]
      );
      if (rows.length > 0) {
        const prefs = typeof rows[0].preferences === 'string'
          ? JSON.parse(rows[0].preferences)
          : rows[0].preferences;
        if (prefs?.[prefKey] === false) return;
      }
    }
  }

  await ensureNotificationsTable();
  await pool.query(
    `INSERT INTO notifications (user_id, from_user_id, type, entity_id, entity_name)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, fromUserId, type, entityId, entityName]
  );
}
