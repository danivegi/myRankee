'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Anton, Inter } from 'next/font/google';
import Link from 'next/link';

const anton = Anton({ weight: '400', subsets: ['latin'], display: 'swap' });
const inter = Inter({ subsets: ['latin'], display: 'swap' });

export default function VerifyEmailPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const token        = searchParams.get('token');

  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No se encontró el token de verificación.');
      return;
    }

    fetch(`/api/auth/verify-email?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setStatus('error');
          setMessage(data.error);
        } else {
          setStatus('success');
          setTimeout(() => router.push('/login?verified=true'), 2500);
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Error de conexión. Inténtalo de nuevo.');
      });
  }, [token, router]);

  return (
    <div className={`${inter.className} flex min-h-screen items-center justify-center bg-[#0A0A0A] px-6`}>
      <div className="w-full max-w-[420px] flex flex-col gap-6 text-center">
        <span className={`${anton.className} text-white text-3xl`}>myrankee</span>

        {status === 'loading' && (
          <>
            <div className="w-10 h-10 border-2 border-[#A855F7] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-[#71717A] text-sm">Verificando tu cuenta...</p>
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
              <p className="text-[#71717A] text-sm">Redirigiendo al inicio de sesión...</p>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <div className="flex flex-col gap-2">
              <h1 className={`${anton.className} text-white text-3xl`}>Enlace inválido</h1>
              <p className="text-[#71717A] text-sm">{message}</p>
            </div>
            <Link href="/login" className="text-[#A855F7] text-sm hover:underline">
              Volver al inicio de sesión
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
