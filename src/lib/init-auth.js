import pool from './db';

let ready = false;

export async function ensureAuthTables() {
  if (ready) return;
  try {
    await pool.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false`
    );
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_verifications (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token      VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token      VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used       BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id           SERIAL PRIMARY KEY,
        email        VARCHAR(255) NOT NULL,
        ip_address   VARCHAR(45),
        successful   BOOLEAN DEFAULT false,
        attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email, attempted_at)`
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address, attempted_at)`
    );
    await pool.query(`
      CREATE TABLE IF NOT EXISTS security_logs (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
        event_type VARCHAR(50) NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        metadata   JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_security_logs_user ON security_logs(user_id, created_at)`
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_security_logs_event ON security_logs(event_type, created_at)`
    );
    ready = true;
  } catch (e) {
    console.error('ensureAuthTables:', e.message);
  }
}

// Fire-and-forget security event logger — never throws.
export function logSecurityEvent({ userId = null, eventType, ip = null, userAgent = null, metadata = {} }) {
  pool.query(
    `INSERT INTO security_logs (user_id, event_type, ip_address, user_agent, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, eventType, ip, userAgent, JSON.stringify(metadata)]
  ).catch((e) => console.error('[security_log]', e.message));
}
