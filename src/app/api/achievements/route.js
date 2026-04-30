import pool from '@/lib/db';
import { ensureAchievementsTable } from '@/lib/achievements';

export async function GET() {
  try {
    await ensureAchievementsTable();
    const res = await pool.query(
      `SELECT id, code AS key, title, description, tier,
              requirement_type, requirement_value, is_secret
       FROM achievements
       ORDER BY requirement_type, requirement_value ASC`
    );
    return Response.json(res.rows);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
