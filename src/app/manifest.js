// Served at /manifest.webmanifest (the app's only manifest). Icons are resized from
// public/icons/icon-1024.png (any) and public/icons/icon-maskable-1024.png (maskable).
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
      { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-192.png',     sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/maskable-512.png',     sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
