'use client';

import { checkPassword } from '@/lib/password';

const STRENGTH = {
  weak:   { color: '#EF4444', label: 'Débil',  pct: 33  },
  medium: { color: '#EAB308', label: 'Media',  pct: 66  },
  strong: { color: '#22C55E', label: 'Fuerte', pct: 100 },
};

export default function PasswordStrength({ password }) {
  if (!password) return null;
  const { results, strength } = checkPassword(password);
  const { color, label, pct }  = STRENGTH[strength];

  return (
    <div className="flex flex-col gap-2 mt-1.5">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 rounded-full bg-[#1A1A1A] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
        <span className="text-[10px] font-mono w-10 text-right flex-shrink-0" style={{ color }}>
          {label}
        </span>
      </div>

      {/* Checklist */}
      <div className="flex flex-col gap-0.5">
        {results.map((r) => (
          <span key={r.key} className="flex items-center gap-1.5 text-xs leading-5">
            <span style={{ color: r.met ? '#22C55E' : '#EF4444', flexShrink: 0, fontWeight: 700 }}>
              {r.met ? '✓' : '✗'}
            </span>
            <span style={{ color: r.met ? '#A1A1AA' : '#52525B' }}>{r.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
