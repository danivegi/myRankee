'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('cookie_consent') === 'accepted') return;
    setVisible(true);
    // Small delay so the slide-up animation plays after mount
    requestAnimationFrame(() => setMounted(true));
  }, []);

  function accept() {
    localStorage.setItem('cookie_consent', 'accepted');
    setMounted(false);
    setTimeout(() => setVisible(false), 300);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9998] transition-transform duration-300 ease-out"
      style={{ transform: mounted ? 'translateY(0)' : 'translateY(100%)' }}
    >
      <div className="border-t border-[#1A1A1A] bg-[#111111] px-6 py-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-start gap-3 flex-1">
            <svg className="flex-shrink-0 mt-0.5" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
              <path d="M8.5 8.5v.01" /><path d="M16 15.5v.01" /><path d="M12 12v.01" />
            </svg>
            <p className="text-[#9CA3AF] text-sm leading-relaxed">
              Usamos <span className="text-white font-medium">cookies esenciales</span> para que myRankee funcione correctamente.
              No usamos cookies de seguimiento ni publicidad.{' '}
              <Link href="/cookies" className="text-[#A855F7] hover:underline">Más información</Link>
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link
              href="/cookies"
              className="text-[#71717A] text-sm hover:text-white transition-colors px-4 py-2"
            >
              Más información
            </Link>
            <button
              onClick={accept}
              className="px-5 py-2 rounded-lg bg-[#A855F7] hover:bg-[#9333EA] text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              Aceptar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
