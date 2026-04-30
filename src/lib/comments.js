import pool from './db';

export async function ensureCommentsTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS review_comments (
      id         SERIAL      PRIMARY KEY,
      review_id  INTEGER     NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
      user_id    INTEGER     NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
      content    TEXT        NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(
    `ALTER TABLE reviews ADD COLUMN IF NOT EXISTS comments_count INTEGER NOT NULL DEFAULT 0`
  );
  await pool.query(
    `ALTER TABLE reviews ADD COLUMN IF NOT EXISTS shares_count INTEGER NOT NULL DEFAULT 0`
  );
}
