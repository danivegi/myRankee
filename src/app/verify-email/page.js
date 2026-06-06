'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Anton, Inter } from 'next/font/google';
import Link from 'next/link';

const anton = Anton({ weight: '400', subsets: ['latin'], display: 'swap' });
const inter = Inter({ subsets: ['latin'], display: 'swap' });

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const [status,   setStatus]   = useState('loading'); // 'loading' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setErrorMsg('No se encontró el token de verificación.');
      setStatus('error');
      return;
    }
    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, data: d })))
      .then(({ ok, data }) => {
        if (ok) {
          setStatus('success');
        } else {
          setErrorMsg(data.error || 'Error al verificar el email.');
          setStatus('error');
        }
      })
      .catch(() => {
        setErrorMsg('Error de conexión. Inténtalo de nuevo.');
        setStatus('error');
      });
  }, [searchParams]);

  useEffect(() => {
    if (status !== 'success') return;
    const t = setTimeout(() => router.push('/login?verified=true'), 2500);
    return () => clearTimeout(t);
  }, [status, router]);

  return (
    <div className={`${inter.className} flex min-h-screen items-center justify-center bg-[#0A0A0A] px-6`}>
      <div className="w-full max-w-[420px] flex flex-col gap-6 text-center">
        <span className={`${anton.className} text-white text-3xl`}>myrankee</span>

        {status === 'loading' && (
          <>
            <div className="w-14 h-14 rounded-full bg-[#A855F7]/10 flex items-center justify-center mx-auto">
              <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="2.5" strokeLinecap="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </div>
            <div className="flex flex-col gap-2">
              <h1 className={`${anton.className} text-white text-3xl`}>Verificando...</h1>
              <p className="text-[#71717A] text-sm">Estamos activando tu cuenta.</p>
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-14 h-14 rounded-full bg-[#22C55E]/10 flex items-center justify-center mx-auto">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="flex flex-col gap-2">
              <h1 className={`${anton.className} text-white text-3xl`}>¡Cuenta verificada!</h1>
              <p className="text-[#71717A] text-sm">Tu cuenta está activa. Ya puedes iniciar sesión.</p>
              <p className="text-[#3F3F46] text-xs">Redirigiendo automáticamente...</p>
            </div>
            <Link
              href="/login?verified=true"
              className="inline-block px-6 py-2.5 rounded-full bg-[#A855F7] text-white text-sm font-semibold hover:bg-[#9333EA] transition-colors"
            >
              Iniciar sesión
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
              <p className="text-[#71717A] text-sm">{errorMsg}</p>
            </div>
            <Link
              href="/login"
              className="inline-block px-6 py-2.5 rounded-full bg-[#A855F7] text-white text-sm font-semibold hover:bg-[#9333EA] transition-colors"
            >
              Ir al inicio de sesión
            </Link>
            <p className="text-[#71717A] text-xs">
              Desde el inicio de sesión puedes solicitar un nuevo enlace de verificación.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
