import Link from 'next/link';
import { Anton, Inter } from 'next/font/google';
import Navbar from '@/app/components/Navbar';

const anton = Anton({ weight: '400', subsets: ['latin'], display: 'swap' });
const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata = {
  title: 'Términos de Servicio',
  description: 'Términos y condiciones de uso de MyRankee.',
};

const SECTIONS = [
  { id: 'aceptacion',      label: 'Aceptación' },
  { id: 'descripcion',     label: 'Descripción del servicio' },
  { id: 'cuentas',         label: 'Cuentas de usuario' },
  { id: 'contenido',       label: 'Contenido del usuario' },
  { id: 'prohibido',       label: 'Contenido prohibido' },
  { id: 'propiedad',       label: 'Propiedad intelectual' },
  { id: 'responsabilidad', label: 'Limitación de responsabilidad' },
  { id: 'suspension',      label: 'Suspensión y eliminación' },
  { id: 'modificaciones',  label: 'Modificaciones' },
  { id: 'ley',             label: 'Ley aplicable' },
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

function Li({ children }) {
  return (
    <li className="flex items-start gap-2 text-[#9CA3AF] text-sm leading-relaxed">
      <span className="text-[#A855F7] mt-1.5 flex-shrink-0">•</span>
      <span>{children}</span>
    </li>
  );
}

export default function TermsPage() {
  return (
    <div className={`${inter.className} min-h-screen bg-[#0A0A0A] flex flex-col`}>
      <Navbar />

      <div className="flex-1 max-w-5xl mx-auto px-6 py-12 w-full">
        <div className="mb-10 flex flex-col gap-2">
          <span className="text-[#A855F7] text-xs font-mono uppercase tracking-widest">Legal</span>
          <h1 className={`${anton.className} text-white text-4xl md:text-5xl leading-none`}>
            Términos de Servicio
          </h1>
          <p className="text-[#71717A] text-sm">Última actualización: 29 de mayo de 2026</p>
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

            <Section id="aceptacion" title="Aceptación de los términos">
              <P>
                Al acceder o usar MyRankee, aceptas estos Términos de Servicio en su totalidad. Si no estás
                de acuerdo con alguna parte de estos términos, no podrás acceder al servicio.
              </P>
              <P>
                Al registrarte, declaras que has leído, comprendido y aceptado estos términos, así como nuestra{' '}
                <Link href="/privacy" className="text-[#A855F7] hover:underline">Política de Privacidad</Link>{' '}
                y{' '}
                <Link href="/cookies" className="text-[#A855F7] hover:underline">Política de Cookies</Link>.
              </P>
            </Section>

            <Section id="descripcion" title="Descripción del servicio">
              <P>
                MyRankee es una plataforma online que permite a los usuarios descubrir videojuegos, asignar
                puntuaciones, escribir reseñas, crear listas personalizadas y conectar con otros jugadores.
              </P>
              <P>
                El servicio se ofrece de forma gratuita. Nos reservamos el derecho de introducir funciones
                de pago en el futuro, siempre con aviso previo.
              </P>
            </Section>

            <Section id="cuentas" title="Cuentas de usuario">
              <div className="flex flex-col gap-2">
                <p className="text-white text-sm font-semibold">Requisitos de edad</p>
                <ul className="flex flex-col gap-1.5">
                  <Li>
                    Si resides en España, debes tener al menos <strong className="text-white">14 años</strong> para
                    registrarte.
                  </Li>
                  <Li>
                    Si resides en otro país de la UE o fuera de ella, debes tener al menos{' '}
                    <strong className="text-white">16 años</strong>, salvo que la legislación de tu país fije
                    un umbral inferior.
                  </Li>
                  <Li>
                    Si eres menor de 18 años, debes contar con el consentimiento de tu tutor legal.
                  </Li>
                </ul>
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-white text-sm font-semibold">Responsabilidades</p>
                <ul className="flex flex-col gap-1.5">
                  <Li>Debes proporcionar información veraz y mantenerla actualizada.</Li>
                  <Li>Eres el único responsable de mantener la confidencialidad de tu contraseña.</Li>
                  <Li>Debes notificarnos inmediatamente cualquier uso no autorizado de tu cuenta.</Li>
                  <Li>No puedes crear más de una cuenta por persona.</Li>
                  <Li>No puedes transferir o vender tu cuenta a terceros.</Li>
                </ul>
              </div>
            </Section>

            <Section id="contenido" title="Contenido del usuario">
              <P>
                <strong className="text-white">Propiedad:</strong> Eres el titular de las reseñas, comentarios
                y listas que publicas en MyRankee. No te cedemos ningún derecho sobre ellos.
              </P>
              <P>
                <strong className="text-white">Licencia de uso:</strong> Al publicar contenido en MyRankee,
                nos otorgas una licencia no exclusiva, mundial, libre de regalías y sublicenciable para
                mostrar, distribuir y reproducir dicho contenido dentro de la plataforma, incluyendo en
                vistas de otros usuarios y en resultados de búsqueda.
              </P>
              <P>
                Esta licencia es estrictamente para operar el servicio y no incluye el uso con fines
                publicitarios ni la venta a terceros.
              </P>
              <P>
                Al publicar contenido, declaras que tienes los derechos necesarios para hacerlo y que
                no vulneras derechos de terceros.
              </P>
            </Section>

            <Section id="prohibido" title="Contenido prohibido">
              <P>Está estrictamente prohibido publicar contenido que:</P>
              <ul className="flex flex-col gap-1.5">
                <Li>Sea ilegal, amenazante, acosador, difamatorio u obsceno.</Li>
                <Li>Infrinja derechos de propiedad intelectual de terceros.</Li>
                <Li>Contenga spam, publicidad no solicitada o enlaces maliciosos.</Li>
                <Li>Suplante la identidad de otra persona o entidad.</Li>
                <Li>Promueva discriminación por raza, género, orientación sexual, religión o nacionalidad.</Li>
                <Li>Contenga malware, virus o código diseñado para dañar sistemas informáticos.</Li>
                <Li>Trate de hackear, hacer scraping masivo o sobrecargar los servidores de MyRankee.</Li>
                <Li>Publique datos personales de terceros sin su consentimiento.</Li>
              </ul>
              <P>
                El incumplimiento de estas normas puede resultar en la suspensión o eliminación permanente
                de tu cuenta.
              </P>
            </Section>

            <Section id="propiedad" title="Propiedad intelectual de MyRankee">
              <P>
                El diseño, código fuente, logotipos, marcas, gráficos y demás elementos de MyRankee son propiedad exclusiva de Daniel Vega Alcázar (titular de la plataforma MyRankee) o de sus licenciatarios, y están protegidos por la legislación de propiedad intelectual.
              </P>
              <P>
                Los datos de videojuegos (portadas, descripciones, metadatos) son proporcionados por
                IGDB (Twitch Interactive, Inc.) bajo sus propios términos de uso.
              </P>
              <P>
                No puedes copiar, modificar, distribuir ni usar el contenido propiedad de MyRankee sin
                autorización escrita previa.
              </P>
            </Section>

            <Section id="responsabilidad" title="Limitación de responsabilidad">
              <P>
                MyRankee se ofrece <strong className="text-white">"tal cual"</strong> y{' '}
                <strong className="text-white">"según disponibilidad"</strong>. No garantizamos que el
                servicio sea ininterrumpido, seguro o libre de errores.
              </P>
              <ul className="flex flex-col gap-1.5">
                <Li>No somos responsables de pérdidas de datos debidas a fallos técnicos.</Li>
                <Li>No somos responsables de las opiniones expresadas por los usuarios.</Li>
                <Li>No somos responsables de daños indirectos, incidentales o consecuentes.</Li>
                <Li>Nuestra responsabilidad máxima total no superará 100 €.</Li>
              </ul>
            </Section>

            <Section id="suspension" title="Suspensión y eliminación de cuentas">
              <P>
                Nos reservamos el derecho de suspender o eliminar cuentas que violen estos términos, sin
                previo aviso en casos graves.
              </P>
              <ul className="flex flex-col gap-1.5">
                <Li>Suspensión temporal: para infracciones menores o primera infracción.</Li>
                <Li>Eliminación permanente: para infracciones graves o reincidentes.</Li>
                <Li>
                  Puedes eliminar tu propia cuenta en cualquier momento desde{' '}
                  <Link href="/settings" className="text-[#A855F7] hover:underline">Configuración</Link>.
                </Li>
              </ul>
              <P>
                Tras la eliminación, tus datos serán eliminados conforme a nuestra{' '}
                <Link href="/privacy" className="text-[#A855F7] hover:underline">Política de Privacidad</Link>.
              </P>
            </Section>

            <Section id="modificaciones" title="Modificaciones del servicio">
              <P>
                Podemos modificar, suspender o discontinuar cualquier parte del servicio en cualquier momento.
                Te notificaremos con al menos 30 días de antelación ante cambios significativos en estos términos.
              </P>
              <P>
                El uso continuado de MyRankee tras la publicación de cambios constituye la aceptación
                de los nuevos términos.
              </P>
            </Section>

            <Section id="ley" title="Ley aplicable">
              <P>
                Estos términos se rigen por la legislación española. Cualquier disputa se someterá a los
                tribunales competentes de España, sin perjuicio de los derechos que como consumidor te
                correspondan según la normativa de tu país de residencia.
              </P>
              <P>
                Para usuarios de la UE, también aplican las disposiciones del Reglamento (UE) 2016/679
                (RGPD) y la Directiva de Servicios de la Sociedad de la Información.
              </P>
            </Section>

          </main>
        </div>
      </div>

    </div>
  );
}
