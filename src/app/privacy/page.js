import Link from 'next/link';
import { Anton, Inter } from 'next/font/google';
import Navbar from '@/app/components/Navbar';

const anton = Anton({ weight: '400', subsets: ['latin'], display: 'swap' });
const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata = {
  title: 'Política de Privacidad',
  description: 'Política de privacidad de myRankee. Cómo recogemos, usamos y protegemos tus datos personales.',
};

const SECTIONS = [
  { id: 'quien-somos',    label: '¿Quiénes somos?' },
  { id: 'datos',          label: '¿Qué datos recogemos?' },
  { id: 'uso',            label: '¿Para qué usamos tus datos?' },
  { id: 'compartir',      label: '¿Con quién los compartimos?' },
  { id: 'retencion',      label: 'Retención de datos' },
  { id: 'derechos',       label: 'Tus derechos GDPR' },
  { id: 'contacto',       label: 'Contacto' },
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

export default function PrivacyPage() {
  return (
    <div className={`${inter.className} min-h-screen bg-[#0A0A0A] flex flex-col`}>
      <Navbar />

      <div className="flex-1 max-w-5xl mx-auto px-6 py-12 w-full">
        {/* Header */}
        <div className="mb-10 flex flex-col gap-2">
          <span className="text-[#A855F7] text-xs font-mono uppercase tracking-widest">Legal</span>
          <h1 className={`${anton.className} text-white text-4xl md:text-5xl leading-none`}>
            Política de Privacidad
          </h1>
          <p className="text-[#71717A] text-sm">Última actualización: 29 de abril de 2026</p>
        </div>

        <div className="flex gap-12">
          {/* Sticky sidebar TOC */}
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

          {/* Content */}
          <main className="flex-1 flex flex-col gap-10">

            <Section id="quien-somos" title="¿Quiénes somos?">
              <P>
                myRankee es una comunidad online de videojuegos que permite a los usuarios puntuar, reseñar
                y compartir su experiencia con juegos. Somos el responsable del tratamiento de los datos
                personales que recopilamos a través de esta plataforma.
              </P>
              <P>
                <strong className="text-white">Responsable del tratamiento:</strong> myRankee<br />
                <strong className="text-white">Correo de contacto:</strong> privacidad@myrankee.com<br />
                <strong className="text-white">Ámbito de aplicación:</strong> Unión Europea y resto del mundo
              </P>
            </Section>

            <Section id="datos" title="¿Qué datos recogemos?">
              <P>Recopilamos los siguientes tipos de datos:</P>

              <div className="flex flex-col gap-2">
                <p className="text-white text-sm font-semibold">Datos de registro</p>
                <ul className="flex flex-col gap-1.5">
                  <Li>Nombre y apellido</Li>
                  <Li>Nombre de usuario</Li>
                  <Li>Dirección de correo electrónico</Li>
                  <Li>Contraseña (almacenada como hash bcrypt — nunca en texto plano)</Li>
                  <Li>Fecha y hora de aceptación de los términos</Li>
                </ul>
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-white text-sm font-semibold">Datos de uso</p>
                <ul className="flex flex-col gap-1.5">
                  <Li>Puntuaciones asignadas a videojuegos</Li>
                  <Li>Reseñas y comentarios publicados</Li>
                  <Li>Listas de juegos creadas</Li>
                  <Li>Backlog personal de juegos</Li>
                  <Li>Relaciones de seguidores/seguidos</Li>
                  <Li>Logros desbloqueados</Li>
                </ul>
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-white text-sm font-semibold">Datos técnicos</p>
                <ul className="flex flex-col gap-1.5">
                  <Li>Dirección IP (para seguridad y control de abuso)</Li>
                  <Li>User agent del navegador</Li>
                  <Li>Registros de seguridad (intentos de inicio de sesión, etc.)</Li>
                </ul>
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-white text-sm font-semibold">Cookies</p>
                <ul className="flex flex-col gap-1.5">
                  <Li>Token de sesión JWT (almacenado en localStorage, necesario para el funcionamiento)</Li>
                  <Li>Preferencia de consentimiento de cookies</Li>
                </ul>
              </div>
            </Section>

            <Section id="uso" title="¿Para qué usamos tus datos?">
              <ul className="flex flex-col gap-1.5">
                <Li>Prestar el servicio y gestionar tu cuenta de usuario</Li>
                <Li>Enviarte correos de verificación de email y recuperación de contraseña</Li>
                <Li>Mostrarte contenido relevante de la comunidad (reseñas, puntuaciones)</Li>
                <Li>Detectar y prevenir actividades fraudulentas o abusivas</Li>
                <Li>Mejorar el servicio mediante análisis de uso agregado y anónimo</Li>
                <Li>Cumplir con obligaciones legales</Li>
              </ul>
              <P>
                No utilizamos tus datos para publicidad personalizada. No vendemos tus datos a terceros.
              </P>
            </Section>

            <Section id="compartir" title="¿Con quién compartimos tus datos?">
              <P>
                Compartimos datos únicamente con los siguientes proveedores de servicios, que actúan como
                encargados del tratamiento bajo contratos de protección de datos:
              </P>
              <ul className="flex flex-col gap-1.5">
                <Li>
                  <strong className="text-white">IGDB (Twitch/Amazon):</strong> Consultamos su API para
                  obtener información de videojuegos. No enviamos datos de usuario.
                </Li>
                <Li>
                  <strong className="text-white">Resend:</strong> Plataforma de envío de emails transaccionales
                  (verificación de cuenta, recuperación de contraseña). Recibe tu dirección de email únicamente
                  para estos fines.
                </Li>
                <Li>
                  <strong className="text-white">Vercel:</strong> Plataforma de alojamiento de la aplicación.
                  Procesa las solicitudes del servidor.
                </Li>
                <Li>
                  <strong className="text-white">Proveedor de base de datos:</strong> Almacenamos tus datos en
                  una base de datos PostgreSQL gestionada con cifrado en reposo.
                </Li>
              </ul>
              <P>
                No transferimos datos fuera del Espacio Económico Europeo sin las garantías adecuadas.
              </P>
            </Section>

            <Section id="retencion" title="Retención de datos">
              <ul className="flex flex-col gap-1.5">
                <Li>
                  <strong className="text-white">Cuenta activa:</strong> Conservamos tus datos mientras
                  mantengas tu cuenta activa.
                </Li>
                <Li>
                  <strong className="text-white">Eliminación de cuenta:</strong> Cuando eliminas tu cuenta,
                  borramos permanentemente todos tus datos personales en un plazo máximo de 30 días, salvo
                  obligación legal de conservarlos.
                </Li>
                <Li>
                  <strong className="text-white">Registros de seguridad:</strong> Se conservan durante 12 meses
                  para prevención de fraude.
                </Li>
                <Li>
                  <strong className="text-white">Tokens de email:</strong> Los tokens de verificación y
                  recuperación de contraseña expiran en 24 horas.
                </Li>
              </ul>
            </Section>

            <Section id="derechos" title="Tus derechos GDPR">
              <P>
                En virtud del Reglamento General de Protección de Datos (RGPD), tienes los siguientes
                derechos sobre tus datos personales:
              </P>
              <ul className="flex flex-col gap-2">
                <Li><strong className="text-white">Acceso:</strong> Solicitar una copia de todos tus datos.</Li>
                <Li><strong className="text-white">Rectificación:</strong> Corregir datos inexactos o incompletos.</Li>
                <Li><strong className="text-white">Supresión (derecho al olvido):</strong> Solicitar la eliminación de tus datos.</Li>
                <Li><strong className="text-white">Portabilidad:</strong> Recibir tus datos en formato estructurado (JSON).</Li>
                <Li><strong className="text-white">Oposición:</strong> Oponerte al tratamiento de tus datos para determinadas finalidades.</Li>
                <Li><strong className="text-white">Limitación:</strong> Solicitar que limitemos el tratamiento de tus datos.</Li>
              </ul>

              <div className="p-4 rounded-xl border border-[#A855F7]/30 bg-[#A855F7]/5 mt-2">
                <p className="text-white text-sm font-semibold mb-2">Cómo ejercer tus derechos</p>
                <ul className="flex flex-col gap-1.5">
                  <Li>
                    <strong className="text-white">Exportar tus datos:</strong> Ve a{' '}
                    <Link href="/settings" className="text-[#A855F7] hover:underline">Configuración → Exportar mis datos</Link>
                  </Li>
                  <Li>
                    <strong className="text-white">Eliminar tu cuenta:</strong> Ve a{' '}
                    <Link href="/settings" className="text-[#A855F7] hover:underline">Configuración → Eliminar cuenta</Link>
                  </Li>
                  <Li>
                    <strong className="text-white">Otros derechos:</strong> Escríbenos a privacidad@myrankee.com
                  </Li>
                </ul>
              </div>

              <P>
                Si consideras que el tratamiento de tus datos no es conforme al RGPD, tienes derecho a
                presentar una reclamación ante la{' '}
                <span className="text-white">Agencia Española de Protección de Datos (AEPD)</span>.
              </P>
            </Section>

            <Section id="contacto" title="Contacto">
              <P>
                Para cualquier consulta sobre esta política de privacidad o el tratamiento de tus datos
                personales, puedes contactarnos en:
              </P>
              <div className="p-4 rounded-xl border border-[#1A1A1A] bg-[#111111]">
                <p className="text-white text-sm font-semibold">myRankee — Privacidad</p>
                <p className="text-[#71717A] text-sm mt-1">privacidad@myrankee.com</p>
              </div>
              <P>
                Nos comprometemos a responder en un plazo máximo de 30 días.
              </P>
            </Section>

          </main>
        </div>
      </div>

    </div>
  );
}
