'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { getAchievementImage } from '@/lib/achievement-images';

const ToastCtx = createContext(null);

export function useToast() {
  const ctx = useContext(ToastCtx);
  return ctx ?? { addToast: () => {}, addAchievementToast: () => {} };
}

const TIER_COLORS = {
  bronce:    '#CD7F32',
  plata:     '#C0C0C0',
  oro:       '#FFD700',
  diamante:  '#B9F2FF',
  platino:   '#E5E4E2',
  legendario:'#FF6B9D',
};

const TIER_LABELS = {
  bronce:    'Bronce',
  plata:     'Plata',
  oro:       'Oro',
  diamante:  'Diamante',
  platino:   'Platino',
  legendario:'Legendario',
};

// ── Achievement overlay ────────────────────────────────────────────────────────

function AchievementOverlay({ title, tier, code, onClose }) {
  const color      = TIER_COLORS[tier] ?? '#A855F7';
  const isLegend   = tier === 'legendario';
  const hasFiredRef = useRef(false);

  useEffect(() => {
    if (hasFiredRef.current) return;
    hasFiredRef.current = true;

    async function fire() {
      try {
        const confetti = (await import('canvas-confetti')).default;
        if (isLegend) {
          const end = Date.now() + 1600;
          const rainbow = ['#ff0000','#ff7700','#ffff00','#00cc00','#0088ff','#aa00ff'];
          (function frame() {
            confetti({ particleCount: 4, angle: 60,  spread: 60, origin: { x: 0, y: 0.5 }, colors: rainbow });
            confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1, y: 0.5 }, colors: rainbow });
            if (Date.now() < end) requestAnimationFrame(frame);
          })();
        } else {
          confetti({
            particleCount: 70,
            spread: 75,
            origin: { x: 0.5, y: 0.38 },
            colors: [color, color + 'aa', '#ffffff', '#e0e0e0'],
            scalar: 1.1,
          });
        }
      } catch { /* canvas-confetti not available */ }
    }

    fire();
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9997] flex items-center justify-center backdrop-fade-in"
      style={{ backgroundColor: 'rgba(0,0,0,0.72)' }}
      onClick={onClose}
    >
      <div
        className="achievement-card-in flex flex-col items-center gap-5 rounded-2xl p-8 max-w-xs mx-4 text-center select-none"
        style={{
          backgroundColor: '#131313',
          border: `1px solid ${color}`,
          boxShadow: `0 0 50px ${color}40, 0 0 100px ${color}18`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-[10px] font-mono uppercase tracking-[3px] text-[#71717A]">
          ¡Logro desbloqueado!
        </span>

        <div className="w-[180px] h-[180px]">
          <Image
            src={getAchievementImage(code)}
            alt={title}
            width={180}
            height={180}
            quality={100}
            style={{ imageRendering: 'pixelated', width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-white text-lg font-bold leading-snug">{title}</p>
          <span
            className="text-[11px] font-mono px-3 py-1 rounded-full self-center"
            style={{ color, backgroundColor: `${color}20`, border: `1px solid ${color}50` }}
          >
            {TIER_LABELS[tier] ?? tier}
          </span>
        </div>

        <p className="text-[#71717A] text-xs">Toca para cerrar</p>
      </div>
    </div>
  );
}

// ── Toast items ────────────────────────────────────────────────────────────────

function AchievementToastItem({ toast, onRemove }) {
  const color = TIER_COLORS[toast.tier] ?? '#A855F7';
  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-xl shadow-2xl w-80 max-w-[calc(100vw-3rem)]"
      style={{
        backgroundColor: '#111111',
        border: `1px solid ${color}`,
        boxShadow: `0 0 16px ${color}30`,
        animation: toast.exiting
          ? 'toast-out 0.25s ease-in forwards'
          : 'toast-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      <div className="w-16 h-16 flex-shrink-0">
        <Image
          src={getAchievementImage(toast.code)}
          alt={toast.message}
          width={64}
          height={64}
          quality={100}
          style={{ imageRendering: 'pixelated', width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </div>

      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color }}>
          ¡Logro desbloqueado!
        </span>
        <span className="text-white text-sm font-semibold leading-snug truncate">{toast.message}</span>
        <span className="text-[10px] font-mono" style={{ color }}>
          {TIER_LABELS[toast.tier] ?? toast.tier}
        </span>
      </div>

      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 text-[#71717A] hover:text-white transition-colors cursor-pointer ml-1"
        aria-label="Cerrar"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

function ToastItem({ toast, onRemove }) {
  if (toast.type === 'achievement') {
    return <AchievementToastItem toast={toast} onRemove={onRemove} />;
  }

  const isError = toast.type === 'error';
  const accent  = isError ? '#ef4444' : '#22c55e';

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-xl shadow-2xl w-80 max-w-[calc(100vw-3rem)]"
      style={{
        backgroundColor: '#111111',
        border: `1px solid ${accent}`,
        animation: toast.exiting
          ? 'toast-out 0.25s ease-in forwards'
          : 'toast-in 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      <span className="flex-shrink-0 mt-0.5">
        {isError ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      <span className="text-white text-sm flex-1 leading-snug">{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 text-[#71717A] hover:text-white transition-colors cursor-pointer ml-1"
        aria-label="Cerrar"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

// ── Provider ───────────────────────────────────────────────────────────────────

export function ToastProvider({ children }) {
  const [toasts,  setToasts]  = useState([]);
  const [overlay, setOverlay] = useState(null);

  // Auto-dismiss overlay after 2s
  useEffect(() => {
    if (!overlay) return;
    const t = setTimeout(() => setOverlay(null), 2200);
    return () => clearTimeout(t);
  }, [overlay]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 280);
  }, []);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, exiting: false }]);
    setTimeout(() => removeToast(id), 3000);
  }, [removeToast]);

  const addAchievementToast = useCallback(({ title, tier, code }) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message: title, type: 'achievement', tier, code, exiting: false }]);
    setTimeout(() => removeToast(id), 5000);
    // Show full-screen overlay for the first achievement in a burst
    setOverlay((prev) => prev ?? { title, tier, code });
  }, [removeToast]);

  return (
    <ToastCtx.Provider value={{ addToast, addAchievementToast }}>
      {children}

      {/* Achievement overlay */}
      {overlay && (
        <AchievementOverlay
          title={overlay.title}
          tier={overlay.tier}
          code={overlay.code}
          onClose={() => setOverlay(null)}
        />
      )}

      {/* Toast stack */}
      <div
        className="fixed bottom-6 right-6 flex flex-col gap-2 z-[9999] pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
