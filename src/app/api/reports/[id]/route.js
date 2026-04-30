import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { ensureReportsTables } from '@/lib/init-reports';
import { createNotification } from '@/lib/init-notifications';

function getUser(request) {
  const h = request.headers.get('authorization');
  if (!h?.startsWith('Bearer ')) return null;
  try { return jwt.verify(h.slice(7), process.env.JWT_SECRET); }
  catch { return null; }
}

const VALID_ACTIONS = new Set(['dismiss', 'warn', 'delete_content', 'suspend_user']);

const REASON_ES = {
  spam:          'spam o publicidad',
  inappropriate: 'contenido inapropiado',
  harassment:    'acoso o lenguaje ofensivo',
  fake_info:     'información falsa',
  copyright:     'infracción de derechos de autor',
  other:         'incumplimiento de normas',
};

async function getContentAuthor(targetType, targetId) {
  if (targetType === 'user') return Number(targetId);
  const table = targetType === 'review' ? 'reviews' : 'review_comments';
  const r = await pool.query(`SELECT user_id FROM ${table} WHERE id = $1`, [targetId]);
  return r.rows[0]?.user_id ?? null;
}

export async function PUT(request, { params }) {
  await ensureReportsTables();

  const user = getUser(request);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const adminCheck = await pool.query('SELECT is_admin FROM users WHERE id = $1', [user.id]);
  if (!adminCheck.rows[0]?.is_admin) return Response.json({ error: 'Acceso denegado' }, { status: 403 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { action } = body;

  if (!VALID_ACTIONS.has(action)) return Response.json({ error: 'Acción inválida' }, { status: 400 });

  const reportRes = await pool.query('SELECT * FROM reports WHERE id = $1', [id]);
  if (!reportRes.rows.length) return Response.json({ error: 'Reporte no encontrado' }, { status: 404 });

  const report = reportRes.rows[0];
  const reasonEs = REASON_ES[report.reason] ?? report.reason;
  const targetLabel = report.target_type === 'review' ? 'reseña' : report.target_type === 'comment' ? 'comentario' : 'contenido';

  const newStatus = action === 'dismiss' ? 'dismissed' : 'reviewed';

  await pool.query(
    `UPDATE reports SET status = $1, reviewed_by = $2, reviewed_at = NOW(), action_taken = $3 WHERE id = $4`,
    [newStatus, user.id, action, id]
  );

  // ── Resolve content author ────────────────────────────────────────────────

  let contentAuthorId = null;

  if (action === 'warn') {
    contentAuthorId = await getContentAuthor(report.target_type, report.target_id);
  }

  if (action === 'delete_content') {
    if (report.target_type === 'review') {
      contentAuthorId = await getContentAuthor('review', report.target_id);
      await pool.query('DELETE FROM reviews WHERE id = $1', [report.target_id]);
    } else if (report.target_type === 'comment') {
      contentAuthorId = await getContentAuthor('comment', report.target_id);
      await pool.query('DELETE FROM review_comments WHERE id = $1', [report.target_id]);
    }
  }

  if (action === 'suspend_user') {
    contentAuthorId = await getContentAuthor(report.target_type, report.target_id);
    if (contentAuthorId) {
      await pool.query(
        `UPDATE users SET is_suspended = true, suspended_reason = 'Violación de los términos de servicio' WHERE id = $1`,
        [contentAuthorId]
      );
    }
  }

  // ── Notify content author ─────────────────────────────────────────────────

  if (contentAuthorId) {
    const authorMsgMap = {
      warn: `Has recibido un aviso por tu ${targetLabel}. Motivo: ${reasonEs}. Ten cuidado con futuras infracciones.`,
      delete_content: `Tu ${targetLabel} ha sido eliminado por incumplir las normas de la comunidad. Motivo: ${reasonEs}.`,
      suspend_user: `Tu cuenta ha sido suspendida por violar los términos de servicio. Contacta con soporte si crees que es un error.`,
    };
    const authorMsg = authorMsgMap[action];
    const authorType = action === 'suspend_user' ? 'suspended'
      : action === 'delete_content' ? 'content_deleted'
      : 'warning';
    if (authorMsg) {
      createNotification({
        userId: contentAuthorId,
        fromUserId: null,
        type: authorType,
        entityName: authorMsg,
      }).catch(() => {});
    }
  }

  // ── Notify reporter ───────────────────────────────────────────────────────

  const reporterMsg = action === 'dismiss'
    ? `Tu reporte sobre una ${targetLabel} ha sido revisado. No se encontró infracción de las normas.`
    : `Tu reporte ha sido revisado y hemos tomado las medidas necesarias.`;

  createNotification({
    userId: report.reporter_id,
    fromUserId: null,
    type: 'report_reviewed',
    entityName: reporterMsg,
  }).catch(() => {});

  return Response.json({ message: 'Reporte actualizado' });
}
