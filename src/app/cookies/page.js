import Link from 'next/link';
import { Anton, Inter } from 'next/font/google';
import Navbar from '@/app/components/Navbar';

const anton = Anton({ weight: '400', subsets: ['latin'], display: 'swap' });
const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata = {
  title: 'Política de Cookies',
  description: 'Cómo usa myRankee las cookies y tecnologías similares.',
};

const SECTIONS = [
  { id: 'que-son',      label: '¿Qué son las cookies?' },
  { id: 'tipos',        label: 'Cookies que usamos' },
  { id: 'gestion',      label: 'Gestión en el navegador' },
  { id: 'preferencias', label: 'Preferencias en myRankee' },
];

function Section({ id, title, children }) {
  return (
    <section id={id} className="flex flex-col gap-4 scroll-mt-24">
      <h2 className={`${anton.className} text-white text-2xl`}>{title}</h2>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

function P({ children }) {
  return <p className="text-[#9CA3AF] text-sm leading-relaxed">{children}</p>;
}

function CookieRow({ name, type, purpose, duration, required }) {
  return (
    <tr className="border-t border-[#1A1A1A]">
      <td className="py-3 pr-4 text-white text-sm font-mono">{name}</td>
      <td className="py-3 pr-4">
        <span
          className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
          style={required
            ? { color: '#A855F7', borderColor: '#A855F750', backgroundColor: '#A855F710' }
            : { color: '#71717A', borderColor: '#1A1A1A', backgroundColor: 'transparent' }
          }
        >
          {type}
        </span>
      </td>
      <td className="py-3 pr-4 text-[#9CA3AF] text-sm">{purpose}</td>
      <td className="py-3 text-[#71717A] text-sm">{duration}</td>
    </tr>
  );
}

export default function CookiesPage() {
  return (
    <div className={`${inter.className} min-h-screen bg-[#0A0A0A] flex flex-col`}>
      <Navbar />

      <div className="flex-1 max-w-5xl mx-auto px-6 py-12 w-full">
        <div className="mb-10 flex flex-col gap-2">
          <span className="text-[#A855F7] text-xs font-mono uppercase tracking-widest">Legal</span>
          <h1 className={`${anton.className} text-white text-4xl md:text-5xl leading-none`}>
            Política de Cookies
          </h1>
          <p className="text-[#71717A] text-sm">Última actualización: 29 de abril de 2026</p>
        </div>

        <div className="flex gap-12">
          <aside className="hidden lg:block w-56 flex-shrink-0">
            <div className="sticky top-8 flex flex-col gap-1">
              <p className="text-[#3F3F46] text-[10px] font-mono uppercase tracking-widest mb-3">Contenido</p>
              {SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="text-[#71717A] text-xs py-1.5 pl-3 border-l-2 border-[#1A1A1A] hover:text-white hover:border-[#A855F7] transition-colors"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </aside>

          <main className="flex-1 flex flex-col gap-10">

            <Section id="que-son" title="¿Qué son las cookies?">
              <P>
                Las cookies son pequeños archivos de texto que los sitios web almacenan en tu dispositivo
                cuando los visitas. Sirven para que el sitio recuerde información sobre tu visita, como
                tu sesión iniciada o tus preferencias.
              </P>
              <P>
                myRankee también utiliza tecnologías similares como <strong className="text-white">localStorage</strong>,
                que es un almacenamiento local del navegador que funciona de forma parecida a las cookies pero
                no se envía automáticamente al servidor con cada solicitud.
              </P>
            </Section>

            <Section id="tipos" title="Cookies y almacenamiento que usamos">

              <div className="p-4 rounded-xl border border-green-900/40 bg-green-950/20 flex items-start gap-3">
                <svg className="flex-shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <p className="text-[#9CA3AF] text-sm leading-relaxed">
                  myRankee <strong className="text-white">solo usa almacenamiento esencial</strong> para el
                  funcionamiento básico del servicio. No usamos cookies de seguimiento, analíticas de terceros
                  ni publicidad.
                </p>
              </div>

              <div className="rounded-xl border border-[#1A1A1A] overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#111111]">
                      <th className="text-left py-3 px-4 text-[#71717A] text-[11px] font-mono uppercase tracking-wider">Nombre</th>
                      <th className="text-left py-3 px-4 text-[#71717A] text-[11px] font-mono uppercase tracking-wider">Tipo</th>
                      <th className="text-left py-3 px-4 text-[#71717A] text-[11px] font-mono uppercase tracking-wider">Finalidad</th>
                      <th className="text-left py-3 px-4 text-[#71717A] text-[11px] font-mono uppercase tracking-wider">Duración</th>
                    </tr>
                  </thead>
                  <tbody className="bg-[#0D0D0D] px-4">
                    <CookieRow
                      name="token"
                      type="Esencial"
                      purpose="Token JWT de autenticación. Mantiene tu sesión iniciada."
                      duration="Hasta cerrar sesión o expiración (7 días)"
                      required
                    />
                    <CookieRow
                      name="cookie_consent"
                      type="Funcional"
                      purpose="Guarda tu preferencia de aceptación de cookies para no mostrar el banner de nuevo."
                      duration="Indefinida (hasta borrar datos del navegador)"
                      required={false}
                    />
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 mt-2">
                <div className="p-4 rounded-xl border border-[#1A1A1A] bg-[#111111] flex items-start gap-3">
                  <span className="text-[#3F3F46] text-xs font-mono mt-0.5">✗</span>
                  <div>
                    <p className="text-white text-sm font-semibold">Cookies analíticas</p>
                    <p className="text-[#71717A] text-sm mt-0.5">No usamos ninguna. No hay Google Analytics, Mixpanel ni herramientas similares.</p>
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-[#1A1A1A] bg-[#111111] flex items-start gap-3">
                  <span className="text-[#3F3F46] text-xs font-mono mt-0.5">✗</span>
                  <div>
                    <p className="text-white text-sm font-semibold">Cookies publicitarias</p>
                    <p className="text-[#71717A] text-sm mt-0.5">No mostramos publicidad. No hay cookies de seguimiento publicitario.</p>
                  </div>
                </div>
              </div>
            </Section>

            <Section id="gestion" title="Gestión en el navegador">
              <P>
                Puedes controlar y eliminar las cookies y el almacenamiento local directamente desde tu
                navegador. Aquí te explicamos cómo hacerlo en los principales navegadores:
              </P>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { name: 'Chrome',  steps: 'Configuración → Privacidad y seguridad → Borrar datos de navegación' },
                  { name: 'Firefox', steps: 'Opciones → Privacidad y seguridad → Cookies y datos del sitio' },
                  { name: 'Safari',  steps: 'Preferencias → Privacidad → Gestionar datos del sitio web' },
                  { name: 'Edge',    steps: 'Configuración → Privacidad → Borrar datos de exploración' },
                ].map(({ name, steps }) => (
                  <div key={name} className="p-4 rounded-xl border border-[#1A1A1A] bg-[#111111]">
                    <p className="text-white text-sm font-semibold mb-1">{name}</p>
                    <p className="text-[#71717A] text-xs leading-relaxed">{steps}</p>
                  </div>
                ))}
              </div>
              <P>
                Ten en cuenta que borrar las cookies eliminará también tu sesión en myRankee, por lo que
                tendrás que iniciar sesión de nuevo.
              </P>
            </Section>

            <Section id="preferencias" title="Preferencias en myRankee">
              <P>
                Puedes gestionar tus preferencias directamente desde myRankee:
              </P>
              <div className="flex flex-col gap-3">
                <div className="p-4 rounded-xl border border-[#1A1A1A] bg-[#111111] flex items-center justify-between gap-4">
                  <div>
                    <p className="text-white text-sm font-semibold">Exportar mis datos</p>
                    <p className="text-[#71717A] text-xs mt-0.5">Descarga toda tu información personal en formato JSON.</p>
                  </div>
                  <Link
                    href="/settings"
                    className="flex-shrink-0 px-4 py-2 rounded-lg border border-[#3F3F46] text-white text-xs hover:border-[#A855F7] transition-colors"
                  >
                    Configuración
                  </Link>
                </div>
                <div className="p-4 rounded-xl border border-[#1A1A1A] bg-[#111111] flex items-center justify-between gap-4">
                  <div>
                    <p className="text-white text-sm font-semibold">Eliminar mi cuenta</p>
                    <p className="text-[#71717A] text-xs mt-0.5">Elimina permanentemente tu cuenta y todos tus datos.</p>
                  </div>
                  <Link
                    href="/settings"
                    className="flex-shrink-0 px-4 py-2 rounded-lg border border-red-900/60 text-red-400 text-xs hover:border-red-500 transition-colors"
                  >
                    Configuración
                  </Link>
                </div>
              </div>
              <P>
                ¿Tienes dudas? Escríbenos a{' '}
                <span className="text-white">privacidad@myrankee.com</span>
              </P>
            </Section>

          </main>
        </div>
      </div>

    </div>
  );
}
