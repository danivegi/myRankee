import pool from './db';

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

const PREF_COLUMN = {
  like:    'likes_enabled',
  comment: 'comments_enabled',
  follow:  'followers_enabled',
};

export async function createNotification({ userId, fromUserId, type, entityId = null, entityName = null }) {
  if (userId === fromUserId) return;

  if (!SYSTEM_TYPES.has(type)) {
    const col = PREF_COLUMN[type];
    if (col) {
      const { rows } = await pool.query(
        `SELECT ${col} FROM user_notification_preferences WHERE user_id = $1`,
        [userId]
      );
      // If a row exists and the toggle is explicitly false, skip
      if (rows.length > 0 && rows[0][col] === false) return;
    }
  }

  await ensureNotificationsTable();
  await pool.query(
    `INSERT INTO notifications (user_id, from_user_id, type, entity_id, entity_name)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, fromUserId, type, entityId, entityName]
  );
}
