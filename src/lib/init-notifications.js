import pool from './db';
import { isBlockedEitherWay } from './blocks';

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

/**
 * Notifications created by toggles. Each one is identified by recipient + sender + type + target:
 *   like        → entity_id = the GAME id of the liked review (one review per user and game, and the
 *                 recipient is its author, so this pins the review)
 *   follow      → entity_id = NULL (the followed user is the recipient)
 *   list_follow → entity_id = the list id
 * Comments are not toggles: every comment keeps creating its own notification.
 */
const TOGGLE_TYPES = new Set(['like', 'follow', 'list_follow']);

const PREF_KEY = {
  like:    'review_likes',
  comment: 'comments_on_reviews',
  follow:  'new_followers',
};

export async function createNotification({ userId, fromUserId, type, entityId = null, entityName = null }) {
  if (userId === fromUserId) return;
  // Nothing between users who blocked each other (system notifications have no sender).
  if (fromUserId != null && await isBlockedEitherWay(userId, fromUserId)) return;

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

  if (TOGGLE_TYPES.has(type)) {
    // One notification per recipient + sender + type + target: don't add another if it's already
    // there (the existing one is left as is — no re-alert, its read state is kept).
    try {
      await pool.query(
        `INSERT INTO notifications (user_id, from_user_id, type, entity_id, entity_name)
         SELECT $1::int, $2::int, $3::text, $4::int, $5::text
         WHERE NOT EXISTS (
           SELECT 1 FROM notifications
           WHERE user_id = $1::int AND from_user_id = $2::int AND type = $3::text
             AND entity_id IS NOT DISTINCT FROM $4::int
         )`,
        [userId, fromUserId, type, entityId, entityName]
      );
    } catch (err) {
      // 23505: a concurrent request inserted it first (only possible with the optional unique index).
      if (err.code !== '23505') throw err;
    }
    return;
  }

  await pool.query(
    `INSERT INTO notifications (user_id, from_user_id, type, entity_id, entity_name)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, fromUserId, type, entityId, entityName]
  );
}

/**
 * Remove side of a toggle (unlike / unfollow / unfollow list): delete the matching notification, so
 * none remains for something that no longer exists. Preferences don't matter here: a notification
 * created before the user turned that type off is removed too.
 */
export async function deleteToggleNotification({ userId, fromUserId, type, entityId = null }) {
  if (!TOGGLE_TYPES.has(type) || userId === fromUserId) return;
  await ensureNotificationsTable();
  await pool.query(
    `DELETE FROM notifications
     WHERE user_id = $1::int AND from_user_id = $2::int AND type = $3::text
       AND entity_id IS NOT DISTINCT FROM $4::int`,
    [userId, fromUserId, type, entityId]
  );
}
