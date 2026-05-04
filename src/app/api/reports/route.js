import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { ensureReportsTables } from '@/lib/init-reports';
import { checkRateLimit, getIp, rateLimitResponse } from '@/lib/rate-limit';

const VALID_TYPES   = new Set(['review', 'comment', 'user']);
const VALID_REASONS = new Set(['spam', 'inappropriate', 'harassment', 'fake_info', 'copyright', 'other']);

function getUser(request) {
  const h = request.headers.get('authorization');
  if (!h?.startsWith('Bearer ')) return null;
  try { return jwt.verify(h.slice(7), process.env.JWT_SECRET); }
  catch { return null; }
}

export async function POST(request) {
  await ensureReportsTables();

  const user = getUser(request);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const ip = getIp(request);
  const rl = checkRateLimit(`report:${ip}`, 10, 60_000 * 60);
  if (!rl.success) return rateLimitResponse(rl.retryAfter);

  const body = await request.json().catch(() => ({}));
  const { target_type, target_id, reason, description } = body;

  if (!VALID_TYPES.has(target_type))   return Response.json({ error: 'target_type inválido' }, { status: 400 });
  if (!target_id)                      return Response.json({ error: 'target_id requerido' }, { status: 400 });
  if (!VALID_REASONS.has(reason))      return Response.json({ error: 'reason inválido' }, { status: 400 });

  // Cannot report your own content
  if (target_type === 'user' && target_id === user.id) {
    return Response.json({ error: 'No puedes reportarte a ti mismo' }, { status: 400 });
  }
  if (target_type === 'review') {
    const r = await pool.query('SELECT user_id FROM reviews WHERE id = $1', [target_id]);
    if (r.rows[0]?.user_id === user.id) return Response.json({ error: 'No puedes reportar tu propio contenido' }, { status: 400 });
  }
  if (target_type === 'comment') {
    const r = await pool.query('SELECT user_id FROM review_comments WHERE id = $1', [target_id]);
    if (r.rows[0]?.user_id === user.id) return Response.json({ error: 'No puedes reportar tu propio contenido' }, { status: 400 });
  }

  try {
    await pool.query(
      `INSERT INTO reports (reporter_id, target_type, target_id, reason, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, target_type, target_id, reason, description?.slice(0, 500) ?? null]
    );
    return Response.json({ message: 'Reporte enviado' }, { status: 201 });
  } catch (err) {
    if (err.code === '23505') return Response.json({ error: 'Ya has reportado este contenido' }, { status: 409 });
    console.error('[reports POST]', err);
    return Response.json({ error: 'Error al enviar el reporte' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    await ensureReportsTables();

    const user = getUser(request);
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 });

    const adminCheck = await pool.query('SELECT is_admin FROM users WHERE id = $1', [user.id]);
    const isAdmin = adminCheck.rows[0]?.is_admin ?? false;
    if (!isAdmin) return Response.json({ error: 'No tienes permisos de administrador' }, { status: 403 });

    const status = request.nextUrl.searchParams.get('status') ?? 'pending';
    const page   = Math.max(1, parseInt(request.nextUrl.searchParams.get('page') ?? '1', 10));
    const limit  = 20;
    const offset = (page - 1) * limit;

    const res = await pool.query(
      `SELECT
         r.id, r.target_type, r.target_id, r.reason, r.description, r.status,
         r.action_taken, r.created_at, r.reviewed_at,
         u.username   AS reporter_username,
         u.avatar_url AS reporter_avatar,
         rv.username  AS reviewer_username
       FROM reports r
       JOIN users u  ON u.id  = r.reporter_id
       LEFT JOIN users rv ON rv.id = r.reviewed_by
       WHERE r.status = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [status, limit, offset]
    );

    const countRes = await pool.query('SELECT COUNT(*)::int FROM reports WHERE status = $1', [status]);

    return Response.json({ reports: res.rows, total: countRes.rows[0].count, page, limit });
  } catch (err) {
    console.error('[reports GET] error:', err);
    return Response.json({ error: 'Error del servidor', detail: err.message }, { status: 500 });
  }
}
