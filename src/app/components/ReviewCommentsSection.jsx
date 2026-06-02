'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Avatar from '@/app/components/Avatar';
import ReportModal from './ReportModal';
import { parseDbDate } from '@/lib/dateUtils';

function IconFlag({ size = 11 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}


function timeAgo(date) {
  const parsed = parseDbDate(date);
  const diff = Date.now() - parsed.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 2) return 'ahora';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return parsed.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function IconTrash({ size = 11 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" /><path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

export default function ReviewCommentsSection({
  reviewId,
  reviewAuthorUsername,
  currentUsername,
  onCountChange,
}) {
  const [comments, setComments]   = useState(null);
  const [content, setContent]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting]   = useState(null);
  const [error, setError]         = useState('');
  const [reportTarget, setReportTarget] = useState(null);

  useEffect(() => {
    fetch(`/api/reviews/${reviewId}/comments`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setComments(data);
        onCountChange?.(data.length);
      })
      .catch(() => setComments([]));
  }, [reviewId]);

  async function handleSubmit() {
    const token = localStorage.getItem('token');
    if (!token || content.trim().length < 2) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/reviews/${reviewId}/comments`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ content: content.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error al publicar'); return; }
      const updated = [...(comments ?? []), data];
      setComments(updated);
      onCountChange?.(updated.length);
      setContent('');
    } catch {
      setError('Error al publicar el comentario');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId) {
    const token = localStorage.getItem('token');
    if (!token) return;
    setDeleting(commentId);
    try {
      const res = await fetch(`/api/reviews/${reviewId}/comments/${commentId}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const updated = (comments ?? []).filter((c) => c.id !== commentId);
        setComments(updated);
        onCountChange?.(updated.length);
      }
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-[#1A1A1A]">

      {/* ── Comments list ── */}
      {comments === null ? (
        <div className="flex justify-center py-4">
          <div className="w-4 h-4 rounded-full border-2 border-[#A855F7] border-t-transparent animate-spin" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-[#71717A] text-xs italic py-2 px-1">
          {currentUsername
            ? 'Sé el primero en comentar esta reseña'
            : 'Inicia sesión para comentar'}
        </p>
      ) : (
        <div className="flex flex-col gap-3 mb-3 ml-2">
          {comments.map((c) => {
            const canDelete =
              c.username === currentUsername ||
              reviewAuthorUsername === currentUsername;
            return (
              <div key={c.id} className="group flex gap-2.5 items-start">
                {/* Small avatar */}
                <Link href={`/user/${c.username}`} className="flex-shrink-0 mt-0.5">
                  <Avatar user={c} size={24} />
                </Link>

                {/* Bubble */}
                <div
                  className="flex-1 min-w-0 rounded-lg px-3 py-2"
                  style={{ backgroundColor: '#0D0D0D', borderLeft: '2px solid #A855F7' }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Link
                      href={`/user/${c.username}`}
                      className="text-white text-[11px] font-semibold hover:text-[#A855F7] transition-colors"
                    >
                      @{c.username}
                    </Link>
                    <span className="text-[#71717A] text-[10px] font-mono">{timeAgo(c.created_at)}</span>
                    <div className="ml-auto flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {currentUsername && currentUsername !== c.username && (
                        <button
                          onClick={() => setReportTarget(c.id)}
                          className="text-[#71717A] hover:text-red-400 transition-colors cursor-pointer"
                          aria-label="Reportar comentario"
                        >
                          <IconFlag />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(c.id)}
                          disabled={deleting === c.id}
                          className="text-[#71717A] hover:text-red-400 transition-all disabled:opacity-30 cursor-pointer"
                          aria-label="Eliminar comentario"
                        >
                          {deleting === c.id
                            ? <div className="w-2.5 h-2.5 rounded-full border border-[#71717A] border-t-transparent animate-spin" />
                            : <IconTrash />}
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-[#A0A0A0] text-xs leading-relaxed">{c.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Comment form ── */}
      {currentUsername && (
        <div className="flex flex-col gap-1 mt-2 ml-2">
          <div className="flex gap-2 items-end">
            <textarea
              value={content}
              onChange={(e) => { setContent(e.target.value); setError(''); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
              }}
              placeholder="Escribe un comentario..."
              rows={2}
              maxLength={500}
              className="flex-1 bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg px-3 py-2 text-white text-xs placeholder:text-[#71717A] focus:outline-none focus:border-[#A855F7] transition-colors resize-none"
            />
            <button
              onClick={handleSubmit}
              disabled={submitting || content.trim().length < 2 || content.length > 500}
              className="flex-shrink-0 px-3 py-2 rounded-lg bg-[#A855F7] text-[#0A0A0A] text-xs font-semibold hover:bg-[#9333EA] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {submitting ? '...' : 'Publicar'}
            </button>
          </div>
          <div className="flex items-center justify-between">
            {error
              ? <p className="text-red-400 text-[10px]">{error}</p>
              : <span />}
            <span className={`text-[10px] font-mono ${content.length > 450 ? 'text-amber-400' : 'text-[#3F3F46]'}`}>
              {content.length}/500
            </span>
          </div>
        </div>
      )}

      {reportTarget != null && (
        <ReportModal
          targetType="comment"
          targetId={reportTarget}
          onClose={() => setReportTarget(null)}
        />
      )}
    </div>
  );
}
