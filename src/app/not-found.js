import Link from 'next/link';
import { Anton, Inter } from 'next/font/google';

const anton = Anton({ weight: '400', subsets: ['latin'], display: 'swap' });
const inter = Inter({ subsets: ['latin'], display: 'swap' });

export default function NotFound() {
  return (
    <div
      className={`${inter.className} min-h-screen bg-[#0A0A0A] flex items-center justify-center relative overflow-hidden`}
    >
      {/* Purple radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(168,85,247,0.07) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-6 text-center px-8">
        <span
          className={`${anton.className} leading-none select-none`}
          style={{
            fontSize: 'clamp(80px, 20vw, 140px)',
            color: '#A855F7',
            textShadow: '0 0 80px rgba(168,85,247,0.4)',
          }}
        >
          404
        </span>

        <div className="flex flex-col gap-2">
          <h1 className={`${anton.className} text-white text-3xl`}>
            Esta página no existe
          </h1>
          <p className="text-[#71717A] text-sm max-w-sm leading-relaxed">
            Puede que el juego, usuario o lista que buscas no exista o haya sido eliminado.
          </p>
        </div>

        <Link
          href="/"
          className="mt-2 px-8 py-3 rounded-full bg-[#A855F7] text-[#0A0A0A] text-sm font-semibold hover:bg-[#9333EA] transition-colors"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
