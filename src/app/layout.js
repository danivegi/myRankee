import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "./components/ToastProvider";
import CookieBanner from "./components/CookieBanner";
import ConditionalFooter from "./components/ConditionalFooter";
import AnalyticsProvider from "./components/AnalyticsProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL('https://myrankee.com'),
  title: {
    default: 'myRankee - Tu comunidad de videojuegos en español',
    template: '%s - myRankee',
  },
  description: 'Descubre, puntúa y comparte tus videojuegos favoritos. La comunidad de videojuegos más grande en español.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: 'https://myrankee.com',
    siteName: 'myRankee',
    title: 'myRankee - Tu comunidad de videojuegos en español',
    description: 'Descubre, puntúa y comparte tus videojuegos favoritos. La comunidad de videojuegos más grande en español.',
    images: [{ url: '/images/LOGO.png', width: 1200, height: 630, alt: 'myRankee' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'myRankee - Tu comunidad de videojuegos en español',
    description: 'Descubre, puntúa y comparte tus videojuegos favoritos. La comunidad de videojuegos más grande en español.',
    images: ['/images/LOGO.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.svg',      type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple:    '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export const viewport = {
  themeColor: '#A855F7',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full flex flex-col">
        <ToastProvider>
          <div className="animate-page-in flex flex-col flex-1">
            {children}
          </div>
          <ConditionalFooter />
          <CookieBanner />
        </ToastProvider>
        <AnalyticsProvider />
      </body>
    </html>
  );
}
