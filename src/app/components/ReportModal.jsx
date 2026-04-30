'use client';
import { useState } from 'react';
import { useToast } from './ToastProvider';

const REASONS = [
  { value: 'spam',          label: 'Spam o publicidad' },
  { value: 'inappropriate', label: 'Contenido inapropiado' },
  { value: 'harassment',    label: 'Acoso o lenguaje ofensivo' },
  { value: 'fake_info',     label: 'Información falsa' },
  { value: 'copyright',     label: 'Infracción de derechos de autor' },
  { value: 'other',         label: 'Otro' },
];

export default function ReportModal({ targetType, targetId, onClose }) {
  const { addToast } = useToast();
  const [reason, setReason]           = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading]         = useState(false);

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
      if (!res.ok) {
        addToast(data.error ?? 'Error al enviar el reporte', 'error');
      } else {
        addToast('Reporte enviado. Revisaremos el contenido.', 'success');
        onClose();
      }
    } catch {
      addToast('Error de conexión', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl border border-[#1A1A1A] bg-[#111111] p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-base">Reportar contenido</h2>
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
    </div>
  );
}
