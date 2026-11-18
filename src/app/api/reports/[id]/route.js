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

const AUTHOR_TABLE = { review: 'reviews', comment: 'review_comments', list: 'lists' };

async function getContentAuthor(targetType, targetId) {
  if (targetType === 'user') return Number(targetId);
  const table = AUTHOR_TABLE[targetType];
  if (!table) return null;
  const r = await pool.query(`SELECT user_id FROM ${table} WHERE id = $1`, [targetId]);
  return r.rows[0]?.user_id ?? null;
}

// Spanish wording per target (with the right gender: "tu reseña ha sido eliminada").
const TARGET_TEXT = {
  review:  { your: 'tu reseña',     a: 'una reseña',     deleted: 'eliminada' },
  comment: { your: 'tu comentario', a: 'un comentario',  deleted: 'eliminado' },
  list:    { your: 'tu lista',      a: 'una lista',      deleted: 'eliminada' },
  user:    { your: 'tu perfil',     a: 'un perfil',      deleted: 'eliminado' },
};

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
  const text = TARGET_TEXT[report.target_type] ?? { your: 'tu contenido', a: 'un contenido', deleted: 'eliminado' };

  // A profile can't be "deleted" from a report: warn or suspend instead.
  if (action === 'delete_content' && report.target_type === 'user') {
    return Response.json({ error: 'Un perfil no se puede eliminar desde un reporte: usa Avisar o Suspender' }, { status: 400 });
  }

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
    } else if (report.target_type === 'list') {
      // Same cleanup as deleting an account's lists: games and followers first.
      contentAuthorId = await getContentAuthor('list', report.target_id);
      await pool.query('DELETE FROM list_games     WHERE list_id = $1', [report.target_id]);
      await pool.query('DELETE FROM list_followers WHERE list_id = $1', [report.target_id]);
      await pool.query('DELETE FROM lists WHERE id = $1', [report.target_id]);
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
      warn: `Has recibido un aviso por ${text.your}. Motivo: ${reasonEs}. Ten cuidado con futuras infracciones.`,
      delete_content: `${text.your.charAt(0).toUpperCase()}${text.your.slice(1)} ha sido ${text.deleted} por incumplir las normas de la comunidad. Motivo: ${reasonEs}.`,
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
    ? `Tu reporte sobre ${text.a} ha sido revisado. No se encontró infracción de las normas.`
    : `Tu reporte ha sido revisado y hemos tomado las medidas necesarias.`;

  createNotification({
    userId: report.reporter_id,
    fromUserId: null,
    type: 'report_reviewed',
    entityName: reporterMsg,
  }).catch(() => {});

  return Response.json({ message: 'Reporte actualizado' });
}
