'use client';

import { useState } from 'react';
import { Anton, Inter } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';

const anton = Anton({ weight: '400', subsets: ['latin'], display: 'swap' });
const inter = Inter({ subsets: ['latin'], display: 'swap' });

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Introduce tu correo electrónico'); return; }

    setLoading(true);
    try {
      const res  = await fetch('/api/auth/forgot-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error. Inténtalo de nuevo.'); return; }
      setSent(true);
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`${inter.className} flex min-h-screen bg-[#0A0A0A]`}>
      <div className="hidden md:flex relative w-1/2 flex-col">
        <Image src="/images/1.png" alt="Background" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" priority />
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute bottom-10 left-10 flex flex-col gap-2 z-10">
          <span className={`${anton.className} text-white text-5xl leading-none`}>myrankee</span>
          <p className="text-white/70 text-sm max-w-[280px] leading-relaxed">
            Tu diario de videojuegos. Puntúa, reseña y comparte.
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-8 py-12 bg-[#0A0A0A]">
        <div className="w-full max-w-[420px] flex flex-col gap-8">
          <span className={`${anton.className} text-white text-3xl md:hidden`}>myrankee</span>

          {sent ? (
            <div className="flex flex-col gap-6">
              <div className="w-14 h-14 rounded-full bg-[#A855F7]/10 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <div className="flex flex-col gap-2">
                <h1 className={`${anton.className} text-white text-4xl leading-none`}>Revisa tu correo</h1>
                <p className="text-[#71717A] text-sm leading-relaxed">
                  Si <span className="text-white">{email}</span> está registrado, recibirás un enlace para restablecer tu contraseña. El enlace caduca en 1 hora.
                </p>
              </div>
              <Link href="/login" className="text-[#A855F7] text-sm hover:underline">
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <h1 className={`${anton.className} text-white text-4xl leading-none`}>Recupera tu cuenta</h1>
                <p className="text-[#71717A] text-sm">
                  Introduce tu correo y te enviaremos un enlace para restablecer tu contraseña.
                </p>
              </div>

              <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
                <div className="flex flex-col gap-1.5">
                  <label className="text-white text-xs font-medium" htmlFor="email">
                    Correo electrónico
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    className={`bg-[#111111] border rounded-lg px-4 py-3 text-white text-sm placeholder:text-[#71717A] focus:outline-none transition-colors w-full ${error ? 'border-red-500 focus:border-red-400' : 'border-[#1A1A1A] focus:border-[#A855F7]'}`}
                  />
                  {error && <p className="text-red-400 text-xs">{error}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#A855F7] hover:bg-[#9333EA] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm py-3 rounded-lg transition-colors cursor-pointer min-h-[44px]"
                >
                  {loading ? 'Enviando...' : 'Enviar enlace'}
                </button>
              </form>

              <p className="text-center text-[#71717A] text-sm">
                <Link href="/login" className="text-[#A855F7] hover:underline">
                  Volver al inicio de sesión
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
