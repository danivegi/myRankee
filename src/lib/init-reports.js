import pool from './db';

let ready = false;

export async function ensureReportsTables() {
  if (ready) return;
  try {
    // Extra columns on users
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin      BOOLEAN NOT NULL DEFAULT false`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended  BOOLEAN NOT NULL DEFAULT false`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_reason TEXT`);

    // Registration attempt tracking for spam protection
    await pool.query(`
      CREATE TABLE IF NOT EXISTS registration_attempts (
        id         SERIAL PRIMARY KEY,
        ip_address VARCHAR(45) NOT NULL,
        email      VARCHAR(255),
        successful BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reg_attempts_ip
        ON registration_attempts(ip_address, created_at)
    `);

    // Reports
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id            SERIAL PRIMARY KEY,
        reporter_id   INTEGER REFERENCES users(id) ON DELETE CASCADE,
        target_type   VARCHAR(20)  NOT NULL,
        target_id     INTEGER      NOT NULL,
        reason        VARCHAR(50)  NOT NULL,
        description   TEXT,
        status        VARCHAR(20)  NOT NULL DEFAULT 'pending',
        reviewed_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
        reviewed_at   TIMESTAMP,
        action_taken  VARCHAR(30),
        created_at    TIMESTAMP DEFAULT NOW(),
        UNIQUE (reporter_id, target_type, target_id)
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status, created_at DESC)
    `);

    ready = true;
  } catch (e) {
    console.error('ensureReportsTables:', e.message);
  }
}
