'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Anton, Inter } from 'next/font/google';
import Link from 'next/link';

const anton = Anton({ weight: '400', subsets: ['latin'], display: 'swap' });
const inter = Inter({ subsets: ['latin'], display: 'swap' });

function Spinner() {
  return (
    <div className="w-14 h-14 rounded-full bg-[#A855F7]/10 flex items-center justify-center mx-auto">
      <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="2.5" strokeLinecap="round">
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
    </div>
  );
}

function CheckIcon() {
  return (
    <div className="w-14 h-14 rounded-full bg-[#22C55E]/10 flex items-center justify-center mx-auto">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  );
}

function VerifyEmailChange() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  // 'loading' | 'success' | 'already' | 'error'
  const [result,   setResult]   = useState('loading');
  const [email,    setEmail]    = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const hasFetched = useRef(false);

  // No token in the URL: nothing to confirm (derived, not set from the effect).
  const status = token ? result : 'error';
  const message = token ? errorMsg : 'No se encontró el enlace de confirmación.';

  useEffect(() => {
    // Refs survive Strict Mode's remount: confirm at most once.
    if (!token || hasFetched.current) return;
    hasFetched.current = true;

    // POST (not a GET link) so email scanners that prefetch links can't confirm it.
    fetch('/api/users/email/confirm', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token }),
    })
      .then((r) => r.json().then((d) => ({ ok: r.ok, data: d })))
      .then(({ ok, data }) => {
        if (ok) {
          setEmail(data.email ?? '');
          setResult(data.already_confirmed ? 'already' : 'success');
        } else {
          setErrorMsg(data.error || 'No se ha podido confirmar el cambio de email.');
          setResult('error');
        }
      })
      .catch(() => {
        setErrorMsg('Error de conexión. Inténtalo de nuevo.');
        setResult('error');
      });
  }, [token]);

  return (
    <div className="w-full max-w-[420px] flex flex-col gap-6 text-center">
      <span className={`${anton.className} text-white text-3xl`}>myrankee</span>

      {status === 'loading' && (
        <>
          <Spinner />
          <div className="flex flex-col gap-2">
            <h1 className={`${anton.className} text-white text-3xl`}>Confirmando...</h1>
            <p className="text-[#71717A] text-sm">Estamos actualizando el email de tu cuenta.</p>
          </div>
        </>
      )}

      {(status === 'success' || status === 'already') && (
        <>
          <CheckIcon />
          <div className="flex flex-col gap-2">
            <h1 className={`${anton.className} text-white text-3xl`}>
              {status === 'success' ? '¡Email actualizado!' : 'Ya confirmado'}
            </h1>
            <p className="text-[#71717A] text-sm">
              {status === 'success'
                ? 'Tu cuenta ya usa tu nuevo email'
                : 'Este cambio de email ya estaba confirmado. Tu cuenta usa'}
              {email ? <> <span className="text-white">{email}</span></> : null}.
            </p>
          </div>
          <Link
            href="/settings"
            className="inline-block px-6 py-2.5 rounded-full bg-[#A855F7] text-white text-sm font-semibold hover:bg-[#9333EA] transition-colors"
          >
            Ir a Ajustes
          </Link>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="w-14 h-14 rounded-full bg-red-900/20 flex items-center justify-center mx-auto">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className="flex flex-col gap-2">
            <h1 className={`${anton.className} text-white text-3xl`}>Enlace inválido</h1>
            <p className="text-[#71717A] text-sm">{message}</p>
          </div>
          <Link
            href="/settings"
            className="inline-block px-6 py-2.5 rounded-full bg-[#A855F7] text-white text-sm font-semibold hover:bg-[#9333EA] transition-colors"
          >
            Ir a Ajustes
          </Link>
          <p className="text-[#71717A] text-xs">
            Desde Ajustes puedes volver a solicitar el cambio de email. Tu email actual no ha cambiado.
          </p>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailChangePage() {
  return (
    <div className={`${inter.className} flex min-h-screen items-center justify-center bg-[#0A0A0A] px-6`}>
      <Suspense fallback={<Spinner />}>
        <VerifyEmailChange />
      </Suspense>
    </div>
  );
}
