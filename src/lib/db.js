// SQL INJECTION PREVENTION CONVENTION:
// ALL queries MUST use parameterized placeholders ($1, $2, …).
// NEVER interpolate user-supplied values directly into query strings.
// Example — CORRECT:   pool.query('SELECT * FROM users WHERE id = $1', [id])
//            WRONG:    pool.query(`SELECT * FROM users WHERE id = ${id}`)
import pg from 'pg';
import { Pool } from 'pg';

// OID 1114: "timestamp without time zone"
// pg's default parser calls new Date(naiveString) which Node treats as LOCAL time,
// shifting the result by the process timezone (e.g. UTC+2 → 2 h behind).
// The DB stores UTC; override the parser to interpret naive strings as UTC.
pg.types.setTypeParser(1114, (val) => {
  if (val == null) return null;
  return new Date(val.replace(' ', 'T') + 'Z');
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default pool;
