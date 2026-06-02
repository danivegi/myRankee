'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { parseDbDate } from '@/lib/dateUtils';

const STATUS_TABS = [
  { value: 'pending',   label: 'Pendientes' },
  { value: 'reviewed',  label: 'Revisados' },
  { value: 'dismissed', label: 'Descartados' },
];

const ACTION_LABELS = {
  dismiss:        'Descartar',
  warn:           'Avisar',
  delete_content: 'Eliminar contenido',
  suspend_user:   'Suspender usuario',
};

const TARGET_LABELS = {
  review:  'Reseña',
  comment: 'Comentario',
  user:    'Usuario',
};

const REASON_LABELS = {
  spam:          'Spam',
  inappropriate: 'Inapropiado',
  harassment:    'Acoso',
  fake_info:     'Info falsa',
  copyright:     'Copyright',
  other:         'Otro',
};

function formatDate(ts) {
  return parseDbDate(ts).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdminReportsPage() {
  const router = useRouter();
  const [status, setStatus]       = useState('pending');
  const [reports, setReports]     = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [actionModal, setActionModal] = useState(null); // { reportId, action }
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback]   = useState(null); // { type, msg }

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) { router.push('/login'); return; }

      const res = await fetch(`/api/reports?status=${status}&page=${page}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) { router.push('/login'); return; }
      if (res.status === 403) { router.push('/'); return; }

      // Always parse JSON safely — a non-OK response with a body still has useful info
      let data;
      try {
        data = await res.json();
      } catch {
        setFeedback({ type: 'error', msg: `Error del servidor (HTTP ${res.status}). Revisa la consola.` });
        return;
      }

      if (!res.ok) {
        setFeedback({ type: 'error', msg: data?.error ?? `Error ${res.status}` });
        return;
      }

      setReports(data.reports ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setFeedback({ type: 'error', msg: `Error de conexión: ${err.message}` });
    } finally {
      setLoading(false);
    }
  }, [status, page, router]);

  useEffect(() => {
    // Fast client-side guard: verify is_admin before hitting the API
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (!data.user?.is_admin) router.push('/');
      })
      .catch(() => router.push('/'));
  }, [router]);

  useEffect(() => { fetchReports(); }, [fetchReports]);
  useEffect(() => { setPage(1); }, [status]);

  async function handleAction() {
    if (!actionModal) return;
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/reports/${actionModal.reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: actionModal.action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', msg: data.error ?? 'Error al procesar la acción' });
      } else {
        setFeedback({ type: 'success', msg: 'Acción aplicada correctamente' });
        fetchReports();
      }
    } catch {
      setFeedback({ type: 'error', msg: 'Error de conexión' });
    } finally {
      setActionLoading(false);
      setActionModal(null);
      setTimeout(() => setFeedback(null), 3000);
    }
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col gap-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[#A855F7] text-xs font-mono uppercase tracking-widest mb-1">Admin</p>
            <h1 className="text-2xl font-bold">Panel de reportes</h1>
          </div>
          <Link href="/" className="text-[#71717A] text-sm hover:text-white transition-colors">← Inicio</Link>
        </div>

        {/* Feedback */}
        {feedback && (
          <div
            className="rounded-xl px-4 py-3 text-sm"
            style={feedback.type === 'success'
              ? { backgroundColor: '#052e16', border: '1px solid #14532d', color: '#4ade80' }
              : { backgroundColor: '#450a0a', border: '1px solid #7f1d1d', color: '#f87171' }
            }
          >
            {feedback.msg}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[#1A1A1A]">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatus(tab.value)}
              className="px-4 py-2.5 text-sm font-medium transition-colors relative"
              style={status === tab.value
                ? { color: '#A855F7', borderBottom: '2px solid #A855F7', marginBottom: '-1px' }
                : { color: '#71717A' }
              }
            >
              {tab.label}
            </button>
          ))}
          <span className="ml-auto self-center text-[#3F3F46] text-xs">{total} reporte{total !== 1 ? 's' : ''}</span>
        </div>

        {/* Reports list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#A855F7] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <p className="text-[#71717A] text-sm">No hay reportes en esta categoría</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {reports.map((r) => (
              <ReportCard
                key={r.id}
                report={r}
                onAction={(action) => setActionModal({ reportId: r.id, action })}
                isPending={status === 'pending'}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-4 py-2 rounded-lg border border-[#1A1A1A] text-sm text-[#71717A] hover:text-white hover:border-[#3F3F46] transition-colors disabled:opacity-30"
            >
              Anterior
            </button>
            <span className="text-[#71717A] text-sm">{page} / {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 rounded-lg border border-[#1A1A1A] text-sm text-[#71717A] hover:text-white hover:border-[#3F3F46] transition-colors disabled:opacity-30"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>

      {/* Action confirmation modal */}
      {actionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
        >
          <div className="w-full max-w-sm rounded-2xl border border-[#1A1A1A] bg-[#111111] p-6 flex flex-col gap-5">
            <h3 className="text-white font-semibold">Confirmar acción</h3>
            <p className="text-[#9CA3AF] text-sm">
              ¿Aplicar "<strong className="text-white">{ACTION_LABELS[actionModal.action]}</strong>" al reporte #{actionModal.reportId}?
              {actionModal.action === 'suspend_user' && (
                <span className="block mt-2 text-red-400 text-xs">Esta acción suspenderá la cuenta del usuario.</span>
              )}
              {actionModal.action === 'delete_content' && (
                <span className="block mt-2 text-orange-400 text-xs">Esta acción eliminará el contenido permanentemente.</span>
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setActionModal(null)}
                className="flex-1 rounded-xl border border-[#1A1A1A] text-[#9CA3AF] text-sm py-2.5 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAction}
                disabled={actionLoading}
                className="flex-1 rounded-xl text-sm py-2.5 font-medium transition-all disabled:opacity-40"
                style={{
                  backgroundColor: actionModal.action === 'dismiss' ? '#18181B'
                    : actionModal.action === 'warn' ? '#78350F'
                    : actionModal.action === 'delete_content' ? '#7C2D12'
                    : '#7F1D1D',
                  color: '#fff',
                  border: '1px solid',
                  borderColor: actionModal.action === 'dismiss' ? '#3F3F46'
                    : actionModal.action === 'warn' ? '#92400E'
                    : '#991B1B',
                }}
              >
                {actionLoading ? 'Procesando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportCard({ report, onAction, isPending }) {
  const preview = report.target_content
    ? (report.target_content.length > 300 ? report.target_content.slice(0, 300) + '…' : report.target_content)
    : null;

  return (
    <div className="rounded-xl border border-[#1A1A1A] bg-[#111111] p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono px-2 py-0.5 rounded-full border border-[#3F3F46] text-[#9CA3AF]">
              #{report.id}
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full border"
              style={{ color: '#A855F7', borderColor: '#A855F750', backgroundColor: '#A855F710' }}
            >
              {TARGET_LABELS[report.target_type] ?? report.target_type} {report.target_id}
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full border border-[#1A1A1A] text-[#71717A]">
              {REASON_LABELS[report.reason] ?? report.reason}
            </span>
          </div>
          {report.description && (
            <p className="text-[#9CA3AF] text-sm leading-relaxed max-w-xl">{report.description}</p>
          )}
        </div>
        <p className="flex-shrink-0 text-[#3F3F46] text-xs">{formatDate(report.created_at)}</p>
      </div>

      {/* Reported content preview */}
      <div className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-4 py-3 flex flex-col gap-2">
        {preview ? (
          <>
            <div className="flex items-center gap-2 text-xs text-[#71717A] flex-wrap">
              <span className="text-[#3F3F46] uppercase tracking-wide font-mono text-[10px]">
                {TARGET_LABELS[report.target_type] ?? report.target_type} reportado
              </span>
              <span className="text-[#3F3F46]">·</span>
              <span>por</span>
              <span className="text-white font-medium">@{report.target_author}</span>
              {report.target_game_id && (
                <a
                  href={`/game/${report.target_game_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-[#A855F7] text-xs hover:underline flex-shrink-0"
                >
                  Ver en contexto ↗
                </a>
              )}
            </div>
            <p className="text-[#D4D4D8] text-sm leading-relaxed">{preview}</p>
          </>
        ) : (
          <p className="text-[#3F3F46] text-sm italic">[Contenido eliminado]</p>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-[#71717A]">
          <span>Reportado por</span>
          <span className="text-white font-medium">@{report.reporter_username}</span>
          {report.reviewer_username && (
            <>
              <span className="text-[#3F3F46]">·</span>
              <span>Revisado por</span>
              <span className="text-white font-medium">@{report.reviewer_username}</span>
            </>
          )}
          {report.action_taken && (
            <>
              <span className="text-[#3F3F46]">·</span>
              <span className="text-[#9CA3AF]">{ACTION_LABELS[report.action_taken] ?? report.action_taken}</span>
            </>
          )}
        </div>

        {isPending && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => onAction('dismiss')}
              className="px-3 py-1.5 rounded-lg border border-[#1A1A1A] text-[#71717A] text-xs hover:border-[#3F3F46] hover:text-white transition-colors"
            >
              Descartar
            </button>
            <button
              onClick={() => onAction('warn')}
              className="px-3 py-1.5 rounded-lg border text-xs transition-colors cursor-pointer border-amber-900/40 text-amber-400 bg-amber-950/20 hover:bg-amber-900/30 hover:border-amber-700/60"
            >
              Avisar
            </button>
            <button
              onClick={() => onAction('delete_content')}
              className="px-3 py-1.5 rounded-lg border text-xs transition-colors cursor-pointer border-orange-700/30 text-orange-400 bg-orange-950/20 hover:bg-orange-900/30 hover:border-orange-600/60"
            >
              Eliminar contenido
            </button>
            <button
              onClick={() => onAction('suspend_user')}
              className="px-3 py-1.5 rounded-lg border text-xs transition-colors cursor-pointer border-red-800/30 text-red-400 bg-red-950/20 hover:bg-red-900/30 hover:border-red-600/60"
            >
              Suspender
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
