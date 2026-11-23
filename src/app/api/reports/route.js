import { requireAdmin, requireUser } from '@/lib/auth';
import pool from '@/lib/db';
import { ensureReportsTables } from '@/lib/init-reports';
import { checkRateLimit, getIp, rateLimitResponse } from '@/lib/rate-limit';

const VALID_TYPES   = new Set(['review', 'comment', 'list', 'user']);
const VALID_REASONS = new Set(['spam', 'inappropriate', 'harassment', 'fake_info', 'copyright', 'other']);

export async function POST(request) {
  await ensureReportsTables();

  const session = await requireUser(request);
  if (session.response) return session.response;
  const user = session.user;

  const ip = getIp(request);
  const rl = checkRateLimit(`report:${ip}`, 10, 60_000 * 60);
  if (!rl.success) return rateLimitResponse(rl.retryAfter);

  const body = await request.json().catch(() => ({}));
  const { target_type, target_id, reason, description } = body;

  if (!VALID_TYPES.has(target_type))   return Response.json({ error: 'target_type inválido' }, { status: 400 });
  // Ids may arrive as numbers or numeric strings: normalize before comparing with user ids.
  const targetId = Number(target_id);
  if (!Number.isInteger(targetId) || targetId <= 0)
    return Response.json({ error: 'target_id requerido' }, { status: 400 });
  if (!VALID_REASONS.has(reason))      return Response.json({ error: 'reason inválido' }, { status: 400 });

  const me = Number(user.id);

  // The target must exist, and you can't report yourself or your own content.
  if (target_type === 'user') {
    if (targetId === me) return Response.json({ error: 'No puedes reportarte a ti mismo' }, { status: 400 });
    const r = await pool.query('SELECT 1 FROM users WHERE id = $1', [targetId]);
    if (!r.rows.length) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 });
  }
  if (target_type === 'list') {
    const r = await pool.query('SELECT user_id, is_public FROM lists WHERE id = $1', [targetId]);
    const list = r.rows[0];
    // Someone else's private list: the same 404 as a missing one (like GET /api/lists/[id]).
    if (!list || (!list.is_public && Number(list.user_id) !== me))
      return Response.json({ error: 'Lista no encontrada' }, { status: 404 });
    if (Number(list.user_id) === me)
      return Response.json({ error: 'No puedes reportar tu propia lista' }, { status: 400 });
  }
  if (target_type === 'review' || target_type === 'comment') {
    const table = target_type === 'review' ? 'reviews' : 'review_comments';
    const r = await pool.query(`SELECT user_id FROM ${table} WHERE id = $1`, [targetId]);
    if (!r.rows.length) return Response.json({ error: 'Contenido no encontrado' }, { status: 404 });
    if (Number(r.rows[0].user_id) === me) return Response.json({ error: 'No puedes reportar tu propio contenido' }, { status: 400 });
  }

  try {
    await pool.query(
      `INSERT INTO reports (reporter_id, target_type, target_id, reason, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, target_type, targetId, reason, description?.slice(0, 500) ?? null]
    );
    return Response.json({ message: 'Reporte enviado' }, { status: 201 });
  } catch (err) {
    // reports_pending_unique: this user already has a PENDING report on it (reviewed/dismissed ones don't count).
    if (err.code === '23505') return Response.json({ error: 'Ya has reportado este contenido' }, { status: 409 });
    console.error('[reports POST]', err);
    return Response.json({ error: 'Error al enviar el reporte' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    await ensureReportsTables();

    const session = await requireAdmin(request, 'No tienes permisos de administrador');
    if (session.response) return session.response;

    const status = request.nextUrl.searchParams.get('status') ?? 'pending';
    const page   = Math.max(1, parseInt(request.nextUrl.searchParams.get('page') ?? '1', 10));
    const limit  = 20;
    const offset = (page - 1) * limit;

    const res = await pool.query(
      `SELECT
         r.id, r.target_type, r.target_id, r.reason, r.description, r.status,
         r.action_taken, r.created_at, r.reviewed_at,
         reporter.username       AS reporter_username,
         reporter.avatar_url     AS reporter_avatar,
         reviewer.username       AS reviewer_username,
         CASE r.target_type
           WHEN 'review'  THEN rv.content
           WHEN 'comment' THEN cmt.content
           WHEN 'list'    THEN lst.title || COALESCE(E'\n' || lst.description, '')
           WHEN 'user'    THEN COALESCE(tu.bio, '')
         END                                              AS target_content,
         CASE r.target_type
           WHEN 'review'  THEN rv_au.username
           WHEN 'comment' THEN cmt_au.username
           WHEN 'list'    THEN lst_au.username
           WHEN 'user'    THEN tu.username
         END                                              AS target_author,
         COALESCE(rv.igdb_game_id, cmt_rv.igdb_game_id)   AS target_game_id,
         (rv.id IS NOT NULL OR cmt.id IS NOT NULL OR lst.id IS NOT NULL OR tu.id IS NOT NULL) AS target_exists
       FROM reports r
       JOIN  users reporter  ON reporter.id  = r.reporter_id
       LEFT JOIN users reviewer  ON reviewer.id  = r.reviewed_by
       LEFT JOIN reviews rv
         ON r.target_type = 'review'  AND r.target_id = rv.id
       LEFT JOIN users rv_au
         ON rv_au.id = rv.user_id
       LEFT JOIN review_comments cmt
         ON r.target_type = 'comment' AND r.target_id = cmt.id
       LEFT JOIN users cmt_au
         ON cmt_au.id = cmt.user_id
       LEFT JOIN reviews cmt_rv
         ON cmt_rv.id = cmt.review_id
       LEFT JOIN lists lst
         ON r.target_type = 'list'    AND r.target_id = lst.id
       LEFT JOIN users lst_au
         ON lst_au.id = lst.user_id
       LEFT JOIN users tu
         ON r.target_type = 'user'    AND r.target_id = tu.id
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
