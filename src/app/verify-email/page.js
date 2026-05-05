'use client';

// TEMPORARY: No-op for fair demo. All new accounts are auto-verified.
// TODO: Restore API-based verification after configuring myrankee.com in Resend.

import { Anton, Inter } from 'next/font/google';
import Link from 'next/link';

const anton = Anton({ weight: '400', subsets: ['latin'], display: 'swap' });
const inter = Inter({ subsets: ['latin'], display: 'swap' });

export default function VerifyEmailPage() {
  return (
    <div className={`${inter.className} flex min-h-screen items-center justify-center bg-[#0A0A0A] px-6`}>
      <div className="w-full max-w-[420px] flex flex-col gap-6 text-center">
        <span className={`${anton.className} text-white text-3xl`}>myrankee</span>

        <div className="w-14 h-14 rounded-full bg-[#22C55E]/10 flex items-center justify-center mx-auto">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className={`${anton.className} text-white text-3xl`}>¡Cuenta activa!</h1>
          <p className="text-[#71717A] text-sm">Tu cuenta ya está activa, puedes iniciar sesión.</p>
        </div>

        <Link
          href="/login"
          className="inline-block px-6 py-2.5 rounded-full bg-[#A855F7] text-[#0A0A0A] text-sm font-semibold hover:bg-[#9333EA] transition-colors"
        >
          Iniciar sesión
        </Link>
      </div>
    </div>
  );
}
