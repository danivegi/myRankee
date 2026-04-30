import pool from './db';

export async function ensureFollowsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS follows (
      id          SERIAL  PRIMARY KEY,
      follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      followed_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(follower_id, followed_id)
    )
  `);
}
