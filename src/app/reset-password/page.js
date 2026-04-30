'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Anton, Inter } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';
import PasswordStrength from '@/app/components/PasswordStrength';

const anton = Anton({ weight: '400', subsets: ['latin'], display: 'swap' });
const inter = Inter({ subsets: ['latin'], display: 'swap' });

export default function ResetPasswordPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const token        = searchParams.get('token');

  const [password,        setPassword]        = useState('');
  const [confirm,         setConfirm]         = useState('');
  const [showPassword,    setShowPassword]    = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState('');
  const [fieldErrors,     setFieldErrors]     = useState({});

  if (!token) {
    return (
      <div className={`${inter.className} flex min-h-screen items-center justify-center bg-[#0A0A0A] px-6`}>
        <div className="w-full max-w-[420px] text-center flex flex-col gap-4">
          <span className={`${anton.className} text-white text-3xl`}>myrankee</span>
          <p className="text-[#71717A] text-sm">Enlace inválido o caducado.</p>
          <Link href="/forgot-password" className="text-[#A855F7] text-sm hover:underline">
            Solicitar nuevo enlace
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const errs = {};
    if (!password)                    errs.password = 'Introduce una contraseña';
    if (password !== confirm)         errs.confirm  = 'Las contraseñas no coinciden';
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({});

    setLoading(true);
    try {
      const res  = await fetch('/api/auth/reset-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error. Inténtalo de nuevo.'); return; }
      router.push('/login?reset=true');
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  const baseInput = 'bg-[#111111] border rounded-lg px-4 py-3 text-white text-sm placeholder:text-[#71717A] focus:outline-none transition-colors w-full';
  const inputCls  = (err) => `${baseInput} pr-11 ${err ? 'border-red-500 focus:border-red-400' : 'border-[#1A1A1A] focus:border-[#A855F7]'}`;

  function EyeButton({ show, onToggle }) {
    return (
      <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-white transition-colors" aria-label={show ? 'Ocultar' : 'Mostrar'}>
        {show ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    );
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

          <div className="flex flex-col gap-2">
            <h1 className={`${anton.className} text-white text-4xl leading-none`}>Nueva contraseña</h1>
            <p className="text-[#71717A] text-sm">Elige una contraseña segura para tu cuenta.</p>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col gap-1.5">
              <label className="text-white text-xs font-medium" htmlFor="password">Nueva contraseña</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (fieldErrors.password) setFieldErrors((p) => { const n = {...p}; delete n.password; return n; }); }}
                  className={inputCls(fieldErrors.password)}
                />
                <EyeButton show={showPassword} onToggle={() => setShowPassword((v) => !v)} />
              </div>
              {fieldErrors.password && <p className="text-red-400 text-xs">{fieldErrors.password}</p>}
              <PasswordStrength password={password} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-white text-xs font-medium" htmlFor="confirm">Confirmar contraseña</label>
              <div className="relative">
                <input
                  id="confirm"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); if (fieldErrors.confirm) setFieldErrors((p) => { const n = {...p}; delete n.confirm; return n; }); }}
                  className={inputCls(fieldErrors.confirm)}
                />
                <EyeButton show={showConfirm} onToggle={() => setShowConfirm((v) => !v)} />
              </div>
              {fieldErrors.confirm && <p className="text-red-400 text-xs">{fieldErrors.confirm}</p>}
            </div>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#A855F7] hover:bg-[#9333EA] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm py-3 rounded-lg transition-colors cursor-pointer min-h-[44px]"
            >
              {loading ? 'Guardando...' : 'Cambiar contraseña'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
