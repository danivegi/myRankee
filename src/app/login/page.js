'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Anton, Inter } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';
import HCaptcha from '@hcaptcha/react-hcaptcha';

const anton = Anton({ weight: '400', subsets: ['latin'], display: 'swap' });
const inter = Inter({ subsets: ['latin'], display: 'swap' });

export default function LoginPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [showPassword,      setShowPassword]      = useState(false);
  const [loading,           setLoading]           = useState(false);
  const [error,             setError]             = useState('');
  const [identifierError,   setIdentifierError]   = useState('');
  const [banner,            setBanner]            = useState('');
  const [needsVerification, setNeedsVerification] = useState('');
  const [resendSent,        setResendSent]        = useState(false);
  const [resendLoading,     setResendLoading]     = useState(false);
  const [showCaptcha,       setShowCaptcha]       = useState(false);
  const [captchaToken,      setCaptchaToken]      = useState('');
  const [suspended,         setSuspended]         = useState('');
  const captchaRef = useRef(null);

  useEffect(() => {
    if (searchParams.get('expired') === 'true') {
      setBanner('Tu sesión ha caducado. Inicia sesión de nuevo.');
    } else if (searchParams.get('verified') === 'true') {
      setBanner('¡Cuenta verificada! Ya puedes iniciar sesión.');
    } else if (searchParams.get('reset') === 'true') {
      setBanner('Contraseña actualizada correctamente. Ya puedes iniciar sesión.');
    }
  }, [searchParams]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setIdentifierError('');
    setNeedsVerification('');
    setSuspended('');
    const form       = e.currentTarget;
    const identifier = form.identifier.value.trim();
    const password   = form.password.value;

    if (!identifier) { setIdentifierError('Introduce tu correo o nombre de usuario'); return; }
    if (showCaptcha && !captchaToken) { setError('Completa la verificación de seguridad.'); return; }

    setLoading(true);
    try {
      const body = { identifier, password };
      if (captchaToken) body.captcha_token = captchaToken;

      const res  = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        captchaRef.current?.resetCaptcha();
        setCaptchaToken('');

        if (data.needs_verification) {
          setNeedsVerification(data.email || identifier);
          return;
        }
        if (data.suspended_reason) {
          setSuspended(data.suspended_reason);
          return;
        }
        if (res.status === 429) {
          setError(data.error);
        } else if (res.status === 401) {
          if (data.requires_captcha) setShowCaptcha(true);
          setError('Credenciales incorrectas. Verifica tu correo y contraseña.');
        } else if (res.status === 400 && data.requires_captcha) {
          setShowCaptcha(true);
          setError(data.error || 'Completa la verificación de seguridad.');
        } else {
          setError(data.error || 'Error al iniciar sesión. Inténtalo de nuevo.');
        }
        return;
      }

      localStorage.setItem('token', data.token);
      router.push('/');
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!needsVerification || resendLoading) return;
    setResendLoading(true);
    try {
      await fetch('/api/auth/resend-verification', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: needsVerification }),
      });
      setResendSent(true);
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <div className={`${inter.className} flex min-h-screen bg-[#0A0A0A]`}>
      {/* Left column */}
      <div className="hidden md:flex relative w-1/2 flex-col">
        <Image src="/images/1.png" alt="Dark fantasy castle with aurora borealis" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" priority />
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute bottom-10 left-10 flex flex-col gap-2 z-10">
          <span className={`${anton.className} text-white text-5xl leading-none`}>myrankee</span>
          <p className="text-white/70 text-sm max-w-[280px] leading-relaxed">
            Tu diario de videojuegos. Puntúa, reseña y comparte.
          </p>
        </div>
      </div>

      {/* Right column */}
      <div className="flex flex-1 md:w-1/2 items-center justify-center px-8 py-12 bg-[#0A0A0A]">
        <div className="w-full max-w-[420px] flex flex-col gap-8">
          <span className={`${anton.className} text-white text-3xl md:hidden`}>myrankee</span>

          {/* Status banner */}
          {banner && (
            <div className="bg-[#A855F7]/10 border border-[#A855F7]/30 rounded-xl px-4 py-3">
              <p className="text-[#A855F7] text-sm">{banner}</p>
            </div>
          )}

          {/* Suspended banner */}
          {suspended && (
            <div className="bg-red-950/30 border border-red-900/50 rounded-xl px-4 py-4 flex flex-col gap-1">
              <p className="text-red-400 text-sm font-semibold">Cuenta suspendida</p>
              <p className="text-red-300/80 text-xs leading-relaxed">{suspended}</p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <h1 className={`${anton.className} text-white text-4xl leading-none`}>Bienvenido de vuelta</h1>
            <p className="text-[#71717A] text-sm">Inicia sesión para continuar en myrankee</p>
          </div>

          {/* Needs verification panel */}
          {needsVerification ? (
            <div className="flex flex-col gap-4 bg-[#111111] border border-[#1A1A1A] rounded-2xl p-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#EAB308]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EAB308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-white text-sm font-semibold">Verifica tu correo</p>
                  <p className="text-[#71717A] text-xs leading-relaxed">
                    Tu cuenta aún no está verificada. Te enviamos un correo a{' '}
                    <span className="text-white">{needsVerification}</span>.
                  </p>
                </div>
              </div>
              {resendSent ? (
                <p className="text-[#22C55E] text-xs">Correo reenviado. Revisa tu bandeja de entrada.</p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="text-[#A855F7] text-xs hover:underline disabled:opacity-60 text-left"
                >
                  {resendLoading ? 'Enviando...' : 'Reenviar correo de verificación'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setNeedsVerification('')}
                className="text-[#71717A] text-xs hover:text-white transition-colors text-left"
              >
                ← Volver al formulario
              </button>
            </div>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              {/* Email o username */}
              <div className="flex flex-col gap-1.5">
                <label className="text-white text-xs font-medium" htmlFor="identifier">Correo electrónico o usuario</label>
                <input
                  id="identifier" name="identifier" type="text" placeholder="tu@email.com o @usuario" autoComplete="username"
                  onChange={() => setIdentifierError('')}
                  className={`bg-[#111111] border rounded-lg px-4 py-3 text-white text-sm placeholder:text-[#71717A] focus:outline-none transition-colors ${identifierError ? 'border-red-500 focus:border-red-400' : 'border-[#1A1A1A] focus:border-[#A855F7]'}`}
                />
                {identifierError && <p className="text-red-400 text-xs">{identifierError}</p>}
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-white text-xs font-medium" htmlFor="password">Contraseña</label>
                <div className="relative">
                  <input
                    id="password" name="password" type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••" required
                    className="w-full bg-[#111111] border border-[#1A1A1A] rounded-lg px-4 py-3 pr-11 text-white text-sm placeholder:text-[#71717A] focus:outline-none focus:border-[#A855F7] transition-colors"
                  />
                  <button
                    type="button" onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-white transition-colors"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? (
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
                </div>
                <div className="flex justify-end">
                  <Link href="/forgot-password" className="text-[#A855F7] text-xs hover:underline">
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
              </div>

              {/* Conditional hCaptcha */}
              {showCaptcha && (
                <div className="flex flex-col gap-1.5">
                  <HCaptcha
                    ref={captchaRef}
                    sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || '10000000-ffff-ffff-ffff-000000000001'}
                    onVerify={(token) => setCaptchaToken(token)}
                    onExpire={() => setCaptchaToken('')}
                    theme="dark"
                  />
                </div>
              )}

              {error && <p className="text-red-400 text-sm text-center">{error}</p>}

              <button
                type="submit" disabled={loading}
                className="w-full bg-[#A855F7] hover:bg-[#9333EA] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm py-3 rounded-lg transition-colors cursor-pointer"
              >
                {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </button>

            </form>
          )}

          <p className="text-center text-[#71717A] text-sm">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="text-[#A855F7] hover:underline">Regístrate</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
