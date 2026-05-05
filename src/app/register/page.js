'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Anton, Inter } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import PasswordStrength from '@/app/components/PasswordStrength';

const anton = Anton({ weight: '400', subsets: ['latin'], display: 'swap' });
const inter = Inter({ subsets: ['latin'], display: 'swap' });

const EMAIL_RE    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_]+$/;

function FieldError({ msg }) {
  if (!msg) return null;
  return <p className="text-red-400 text-xs mt-1">{msg}</p>;
}

const baseInput = 'bg-[#111111] border rounded-lg px-4 py-3 text-white text-sm placeholder:text-[#71717A] focus:outline-none transition-colors w-full';
const inputCls  = (err) => `${baseInput} ${err ? 'border-red-500 focus:border-red-400' : 'border-[#1A1A1A] focus:border-[#A855F7]'}`;

export default function RegisterPage() {
  const router = useRouter();
  const [password,        setPassword]        = useState('');
  const [confirm,         setConfirm]         = useState('');
  const [showPassword,    setShowPassword]    = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [accepted,     setAccepted]     = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [apiError,     setApiError]     = useState('');
  const [fieldErrors,  setFieldErrors]  = useState({});
  const [registered,   setRegistered]   = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const captchaRef = useRef(null);

  useEffect(() => {
    if (!registered) return;
    const t = setTimeout(() => router.push('/login'), 3000);
    return () => clearTimeout(t);
  }, [registered, router]);

  function validate({ nombre, apellido, username, email, password, confirm }) {
    const errs = {};
    if (!nombre.trim())                   errs.nombre   = 'El nombre es obligatorio';
    if (!apellido.trim())                 errs.apellido = 'El apellido es obligatorio';
    if (!USERNAME_RE.test(username))      errs.username = 'Solo letras, números y guiones bajos (_)';
    if (!EMAIL_RE.test(email))            errs.email    = 'Introduce un correo electrónico válido';
    if (password.length < 8)             errs.password = 'La contraseña debe tener al menos 8 caracteres';
    if (password !== confirm)             errs.confirm  = 'Las contraseñas no coinciden';
    if (!accepted)                        errs.terms    = 'Debes aceptar los términos para continuar';
    if (!ageConfirmed)                    errs.age      = 'Debes confirmar que tienes al menos 14 años';
    if (!captchaToken)                    errs.captcha  = 'Completa la verificación de seguridad';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setApiError('');
    const form     = e.currentTarget;
    const nombre   = form.nombre.value.trim();
    const apellido = form.apellido.value.trim();
    const username = form.username.value.trim().replace(/^@/, '');
    const email    = form.email.value.trim();

    const errs = validate({ nombre, apellido, username, email, password, confirm });
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setLoading(true);

    try {
      const res  = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ nombre, apellido, username, email, password, age_confirmed: true, captcha_token: captchaToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setApiError(data.error || 'Error al registrarse');
        captchaRef.current?.resetCaptcha();
        setCaptchaToken('');
        return;
      }
      setRegistered(true);
    } catch {
      setApiError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  function clearFieldError(field) {
    if (fieldErrors[field]) setFieldErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  }

  if (registered) {
    return (
      <div className={`${inter.className} flex min-h-screen bg-[#0A0A0A]`}>
        <div className="hidden md:flex relative w-1/2 flex-col">
          <Image src="/images/1.png" alt="Background" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" priority />
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute bottom-10 left-10 flex flex-col gap-2 z-10">
            <span className={`${anton.className} text-white text-5xl leading-none`}>myrankee</span>
            <p className="text-white/70 text-sm max-w-[280px] leading-relaxed">Únete a la comunidad de gamers más grande en español.</p>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center px-8 py-12 bg-[#0A0A0A]">
          <div className="w-full max-w-[420px] flex flex-col gap-8">
            <span className={`${anton.className} text-white text-3xl md:hidden`}>myrankee</span>
            <div className="flex flex-col gap-6">
              <div className="w-14 h-14 rounded-full bg-[#22C55E]/10 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className="flex flex-col gap-2">
                <h1 className={`${anton.className} text-white text-4xl leading-none`}>¡Bienvenido!</h1>
                <p className="text-[#71717A] text-sm leading-relaxed">
                  Tu cuenta está lista, ya puedes iniciar sesión.
                </p>
                <p className="text-[#3F3F46] text-xs">Redirigiendo automáticamente...</p>
              </div>
              <Link href="/login" className="text-[#A855F7] text-sm hover:underline">
                Ir al inicio de sesión
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${inter.className} flex min-h-screen bg-[#0A0A0A]`}>
      {/* Left column */}
      <div className="hidden md:flex relative w-1/2 flex-col">
        <Image src="/images/1.png" alt="Sci-fi city background" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" priority />
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute bottom-10 left-10 flex flex-col gap-2 z-10">
          <span className={`${anton.className} text-white text-5xl leading-none`}>myrankee</span>
          <p className="text-white/70 text-sm max-w-[280px] leading-relaxed">
            Únete a la comunidad de gamers más grande en español.
          </p>
        </div>
      </div>

      {/* Right column */}
      <div className="flex flex-1 md:w-1/2 items-center justify-center px-8 py-12 bg-[#0A0A0A]">
        <div className="w-full max-w-[420px] flex flex-col gap-8">

          <span className={`${anton.className} text-white text-3xl md:hidden`}>myrankee</span>

          <div className="flex flex-col gap-2">
            <h1 className={`${anton.className} text-white text-4xl leading-none`}>Crea tu cuenta</h1>
            <p className="text-[#71717A] text-sm">Empieza a puntuar y reseñar tus juegos favoritos</p>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>

            {/* Nombre + Apellido */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-white text-xs font-medium" htmlFor="nombre">Nombre</label>
                <input id="nombre" name="nombre" type="text" className={inputCls(fieldErrors.nombre)} onChange={() => clearFieldError('nombre')} />
                <FieldError msg={fieldErrors.nombre} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-white text-xs font-medium" htmlFor="apellido">Apellido</label>
                <input id="apellido" name="apellido" type="text" className={inputCls(fieldErrors.apellido)} onChange={() => clearFieldError('apellido')} />
                <FieldError msg={fieldErrors.apellido} />
              </div>
            </div>

            {/* Username */}
            <div className="flex flex-col gap-1.5">
              <label className="text-white text-xs font-medium" htmlFor="username">Nombre de usuario</label>
              <input id="username" name="username" type="text" className={inputCls(fieldErrors.username)} onChange={() => clearFieldError('username')} />
              <FieldError msg={fieldErrors.username} />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-white text-xs font-medium" htmlFor="email">Correo electrónico</label>
              <input id="email" name="email" type="email" className={inputCls(fieldErrors.email)} onChange={() => clearFieldError('email')} />
              <FieldError msg={fieldErrors.email} />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-white text-xs font-medium" htmlFor="password">Contraseña</label>
              <div className="relative">
                <input
                  id="password" name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  className={inputCls(fieldErrors.password) + ' pr-11'}
                  onChange={(e) => { setPassword(e.target.value); clearFieldError('password'); }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
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
              <FieldError msg={fieldErrors.password} />
              <PasswordStrength password={password} />
            </div>

            {/* Confirm password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-white text-xs font-medium" htmlFor="confirm">Repite la contraseña</label>
              <div className="relative">
                <input
                  id="confirm"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  className={inputCls(fieldErrors.confirm) + ' pr-11'}
                  onChange={(e) => { setConfirm(e.target.value); clearFieldError('confirm'); }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-white transition-colors"
                  aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showConfirm ? (
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
              <FieldError msg={fieldErrors.confirm} />
            </div>

            {/* Age confirmation */}
            <div>
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative mt-0.5 flex-shrink-0">
                  <input type="checkbox" checked={ageConfirmed} onChange={(e) => { setAgeConfirmed(e.target.checked); clearFieldError('age'); }} className="sr-only" />
                  <div className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${
                    ageConfirmed ? 'bg-[#A855F7] border-[#A855F7]' :
                    fieldErrors.age ? 'bg-[#111111] border-red-500' :
                    'bg-[#111111] border-[#1A1A1A] group-hover:border-[#A855F7]'
                  }`}>
                    {ageConfirmed && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-[#71717A] text-xs leading-relaxed">
                  Confirmo que tengo al menos <span className="text-white">14 años</span>
                </span>
              </label>
              <FieldError msg={fieldErrors.age} />
            </div>

            {/* Terms */}
            <div>
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative mt-0.5 flex-shrink-0">
                  <input type="checkbox" checked={accepted} onChange={(e) => { setAccepted(e.target.checked); clearFieldError('terms'); }} className="sr-only" />
                  <div className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${
                    accepted ? 'bg-[#A855F7] border-[#A855F7]' :
                    fieldErrors.terms ? 'bg-[#111111] border-red-500' :
                    'bg-[#111111] border-[#1A1A1A] group-hover:border-[#A855F7]'
                  }`}>
                    {accepted && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-[#71717A] text-xs leading-relaxed">
                  He leído y acepto los{' '}
                  <Link href="/terms" className="text-[#A855F7] hover:underline">Términos de Servicio</Link>{' '}
                  y la{' '}
                  <Link href="/privacy" className="text-[#A855F7] hover:underline">Política de Privacidad</Link>
                </span>
              </label>
              <FieldError msg={fieldErrors.terms} />
            </div>

            {/* Honeypot — hidden from real users, bots fill it */}
            <input type="text" name="website" tabIndex={-1} aria-hidden="true" style={{ display: 'none' }} autoComplete="off" />

            {/* hCaptcha */}
            <div className="flex flex-col gap-1.5">
              <HCaptcha
                ref={captchaRef}
                sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || '10000000-ffff-ffff-ffff-000000000001'}
                onVerify={(token) => { setCaptchaToken(token); clearFieldError('captcha'); }}
                onExpire={() => setCaptchaToken('')}
                theme="dark"
              />
              {fieldErrors.captcha && <p className="text-red-400 text-xs">{fieldErrors.captcha}</p>}
            </div>

            {apiError && <p className="text-red-400 text-sm text-center">{apiError}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#A855F7] hover:bg-[#9333EA] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm py-3 rounded-lg transition-colors cursor-pointer min-h-[44px]"
            >
              {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#1A1A1A]" />
              <span className="text-[#71717A] text-xs">o</span>
              <div className="flex-1 h-px bg-[#1A1A1A]" />
            </div>

            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 border border-[#1A1A1A] hover:border-[#71717A] bg-transparent text-white text-sm font-medium py-3 rounded-lg transition-colors cursor-pointer min-h-[44px]"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335" />
              </svg>
              Registrarse con Google
            </button>
          </form>

          <p className="text-center text-[#71717A] text-sm">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-[#A855F7] hover:underline">Inicia sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
