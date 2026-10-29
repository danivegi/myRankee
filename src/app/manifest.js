// Served at /manifest.webmanifest. Icons in /public/icons/ are provisional —
// replace them keeping the same filenames and sizes.
export default function manifest() {
  return {
    id: '/',
    name: 'myRankee',
    short_name: 'myRankee',
    description: 'Puntúa, reseña y descubre videojuegos con la comunidad hispanohablante',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0A0A0A',
    theme_color: '#0A0A0A',
    lang: 'es',
    dir: 'ltr',
    icons: [
      { src: '/icons/icon-192.png',          sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png',          sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
