const ACHIEVEMENT_IMAGES = {
  // Ratings
  first_rating:  '/images/achievements/bronce/primer-premio.png',
  rating_10:     '/images/achievements/bronce/critico-novato.png',
  rating_50:     '/images/achievements/plata/critico-experimentado.png',
  rating_100:    '/images/achievements/oro/critico-veterano.png',
  rating_500:    '/images/achievements/platino/leyenda-del-rating.png',
  rating_1000:   '/images/achievements/platino/toca-ducha.png',
  // Reviews
  first_review:  '/images/achievements/bronce/primera-resena.png',
  review_10:     '/images/achievements/bronce/escritor-casual.png',
  review_50:     '/images/achievements/plata/escritor-frecuente.png',
  review_100:    '/images/achievements/oro/escritor-prolifico.png',
  review_200:    '/images/achievements/platino/escritor-de-culto.png',
  // Followers
  first_follower: '/images/achievements/bronce/no-estas-solo.png',
  followers_10:  '/images/achievements/plata/tu-propio-equipo-gamer.png',
  followers_50:  '/images/achievements/oro/lo-mismo-es-hora-de-abrir-directo.png',
  followers_100: '/images/achievements/platino/influencer-gamer.png',
  // Lists
  first_list:    '/images/achievements/bronce/coleccionista.png',
  lists_5:       '/images/achievements/plata/listado.png',
  lists_10:      '/images/achievements/oro/tienes-toc.png',
  // Likes
  first_like:    '/images/achievements/bronce/le-gustas.png',
  likes_50:      '/images/achievements/plata/tu-opinion-importa.png',
  likes_200:     '/images/achievements/oro/la-voz-del-pueblo.png',
  // Backlog
  backlog_10:    '/images/achievements/bronce/cazador-de-juegos.png',
  backlog_50:    '/images/achievements/plata/coleccionista-obsesivo.png',
};

const FALLBACK = '/images/achievements/bronce/primer-premio.png';

export function getAchievementImage(code) {
  const path = ACHIEVEMENT_IMAGES[code] ?? FALLBACK;
  return path;
}
