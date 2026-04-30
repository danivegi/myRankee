// SQL INJECTION PREVENTION CONVENTION:
// ALL queries MUST use parameterized placeholders ($1, $2, …).
// NEVER interpolate user-supplied values directly into query strings.
// Example — CORRECT:   pool.query('SELECT * FROM users WHERE id = $1', [id])
//            WRONG:    pool.query(`SELECT * FROM users WHERE id = ${id}`)
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default pool;
