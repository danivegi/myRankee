import Link from 'next/link';
import { Anton } from 'next/font/google';

const anton = Anton({ weight: '400', subsets: ['latin'], display: 'swap' });

const COLUMNS = [
  {
    heading: 'Producto',
    links: [
      { label: 'Explorar', href: '/search' },
      { label: 'Listas', href: '/lists' },
      { label: 'Feed', href: '/feed' },
    ],
  },
  {
    heading: 'Cuenta',
    links: [
      { label: 'Iniciar sesión', href: '/login' },
      { label: 'Registrarse', href: '/register' },
      { label: 'Configuración', href: '/settings' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Política de privacidad', href: '/privacy' },
      { label: 'Términos de servicio', href: '/terms' },
      { label: 'Política de cookies', href: '/cookies' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-[#1A1A1A] bg-[#0A0A0A] mt-auto">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">

          {/* Brand */}
          <div className="flex flex-col gap-3">
            <span className={`${anton.className} text-white text-2xl leading-none`}>myRankee</span>
            <p className="text-[#71717A] text-xs leading-relaxed max-w-[200px]">
              Tu comunidad de videojuegos en español. Puntúa, reseña y descubre.
            </p>
            {/* Social links */}
            <div className="flex items-center gap-3 mt-2">
              {[
                { label: 'Twitter/X',  href: 'https://x.com/myrankee',                    path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
                { label: 'Instagram',  href: 'https://www.instagram.com/myrankee/',        path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z' },
                { label: 'TikTok',     href: 'https://www.tiktok.com/@myrankee',           path: 'M19.59 6.69a4.83 4.83 0 01-3.77-2.73 30.35 30.35 0 00-.08-4.96h-4v13.28a2.92 2.92 0 01-2.91 2.7 2.92 2.92 0 01-2.91-2.91 2.92 2.92 0 012.91-2.91c.28 0 .54.04.79.1V9.35a6.93 6.93 0 00-.79-.05 6.91 6.91 0 00-6.91 6.91 6.91 6.91 0 006.91 6.91 6.91 6.91 0 006.91-6.91V9.73a9.71 9.71 0 005.68 1.8V7.69a4.83 4.83 0 01-1.83-.99z' },
              ].map(({ label, href, path }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg border border-[#1A1A1A] flex items-center justify-center text-[#71717A] hover:text-white hover:border-[#3F3F46] transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d={path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <div key={col.heading} className="flex flex-col gap-3">
              <h4 className="text-white text-xs font-mono uppercase tracking-widest">{col.heading}</h4>
              {col.links.map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  className="text-[#71717A] text-sm hover:text-white transition-colors w-fit"
                >
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </div>

        <div className="border-t border-[#1A1A1A] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[#3F3F46] text-xs">© 2026 myRankee. Todos los derechos reservados.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-[#3F3F46] text-xs hover:text-[#71717A] transition-colors">Privacidad</Link>
            <Link href="/terms"   className="text-[#3F3F46] text-xs hover:text-[#71717A] transition-colors">Términos</Link>
            <Link href="/cookies" className="text-[#3F3F46] text-xs hover:text-[#71717A] transition-colors">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
