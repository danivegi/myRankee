'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from './ToastProvider';

const REASONS = [
  { value: 'spam',          label: 'Spam o publicidad' },
  { value: 'inappropriate', label: 'Contenido inapropiado' },
  { value: 'harassment',    label: 'Acoso o lenguaje ofensivo' },
  { value: 'fake_info',     label: 'Información falsa' },
  { value: 'copyright',     label: 'Infracción de derechos de autor' },
  { value: 'other',         label: 'Otro' },
];

const TITLES = {
  review:  'Reportar reseña',
  comment: 'Reportar comentario',
  list:    'Reportar lista',
  user:    'Reportar usuario',
};

/**
 * `blockUsername`: the author of the reported content. When set, offers "Bloquear también a @x"
 * (Google Play wants report and block together); `onBlocked` runs after a successful block.
 */
export default function ReportModal({ targetType, targetId, onClose, blockUsername = null, onBlocked }) {
  const { addToast } = useToast();
  const [reason, setReason]           = useState('');
  const [description, setDescription] = useState('');
  const [alsoBlock, setAlsoBlock]     = useState(false);
  const [loading, setLoading]         = useState(false);
  const [mounted, setMounted]         = useState(false);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!reason) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ target_type: targetType, target_id: targetId, reason, description: description.trim() || undefined }),
      });
      const data = await res.json();
      // Blocking also goes ahead when it was already reported (409): that's still what the user asked.
      let blocked = false;
      if (alsoBlock && blockUsername && (res.ok || res.status === 409)) {
        const b = await fetch(`/api/users/${encodeURIComponent(blockUsername)}/block`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        blocked = b.ok;
        if (!b.ok) {
          const bd = await b.json().catch(() => ({}));
          addToast(bd.error ?? `No se ha podido bloquear a @${blockUsername}`, 'error');
        } else {
          onBlocked?.(blockUsername);
        }
      }
      if (!res.ok) {
        if (blocked) {
          addToast(`${data.error ?? 'Ya habías reportado este contenido'}. Has bloqueado a @${blockUsername}.`, 'success');
          onClose();
        } else {
          addToast(data.error ?? 'Error al enviar el reporte', 'error');
        }
      } else {
        addToast(
          blocked ? `Reporte enviado. Has bloqueado a @${blockUsername}.` : 'Reporte enviado. Revisaremos el contenido.',
          'success'
        );
        onClose();
      }
    } catch {
      addToast('Error de conexión', 'error');
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl border border-[#1A1A1A] bg-[#111111] p-6 flex flex-col gap-5 max-h-[calc(90vh_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom))] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-base">{TITLES[targetType] ?? 'Reportar contenido'}</h2>
          <button onClick={onClose} className="text-[#71717A] hover:text-white transition-colors" aria-label="Cerrar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[#9CA3AF] text-xs font-medium">Motivo del reporte</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="w-full rounded-lg border border-[#1A1A1A] bg-[#0A0A0A] text-white text-sm px-3 py-2.5 focus:outline-none focus:border-[#A855F7] transition-colors appearance-none"
            >
              <option value="" disabled>Selecciona un motivo…</option>
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[#9CA3AF] text-xs font-medium">
              Descripción <span className="text-[#3F3F46]">(opcional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Añade más contexto si lo necesitas…"
              className="w-full rounded-lg border border-[#1A1A1A] bg-[#0A0A0A] text-white text-sm px-3 py-2.5 focus:outline-none focus:border-[#A855F7] transition-colors resize-none placeholder-[#3F3F46]"
            />
            <p className="text-[#3F3F46] text-xs text-right">{description.length}/500</p>
          </div>

          {blockUsername && (
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={alsoBlock}
                onChange={(e) => setAlsoBlock(e.target.checked)}
                className="mt-0.5 accent-[#EF4444] cursor-pointer"
              />
              <span className="text-[#D4D4D8] text-sm">
                Bloquear también a <span className="text-white font-medium">@{blockUsername}</span>
                <span className="block text-[#71717A] text-xs mt-0.5">
                  No podréis seguiros ni interactuar, y dejarás de ver su actividad. No recibirá ningún aviso.
                </span>
              </span>
            </label>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-[#1A1A1A] text-[#9CA3AF] text-sm py-2.5 hover:border-[#3F3F46] hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!reason || loading}
              className="flex-1 rounded-xl text-sm py-2.5 font-medium transition-all disabled:opacity-40"
              style={{ backgroundColor: '#EF4444', color: '#fff' }}
            >
              {loading ? 'Enviando…' : 'Reportar'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}