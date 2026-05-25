const ACHIEVEMENT_IMAGES = {
  // Ratings
  rate_1:     '/images/achievements/bronce/primer-premio.png',
  rate_10:    '/images/achievements/bronce/critico-novato.png',
  rate_25:    '/images/achievements/plata/critico-experimentado.png',
  rate_50:    '/images/achievements/oro/critico-veterano.png',
  rate_100:   '/images/achievements/platino/leyenda-del-rating.png',
  // Reviews
  review_1:   '/images/achievements/bronce/primera-resena.png',
  review_5:   '/images/achievements/plata/escritor-frecuente.png',
  review_15:  '/images/achievements/oro/escritor-prolifico.png',
  review_30:  '/images/achievements/platino/escritor-de-culto.png',
  // Followers
  follow_1:   '/images/achievements/bronce/no-estas-solo.png',
  follow_10:  '/images/achievements/plata/tu-propio-equipo-gamer.png',
  follow_50:  '/images/achievements/oro/lo-mismo-es-hora-de-abrir-directo.png',
  follow_100: '/images/achievements/platino/influencer-gamer.png',
  // Lists
  list_1:     '/images/achievements/bronce/coleccionista.png',
  list_5:     '/images/achievements/plata/listado.png',
  // Likes
  like_1:     '/images/achievements/bronce/le-gustas.png',
  like_25:    '/images/achievements/oro/la-voz-del-pueblo.png',
  // Backlog
  backlog_1:  '/images/achievements/bronce/cazador-de-juegos.png',
  backlog_20: '/images/achievements/plata/coleccionista-obsesivo.png',
};

const FALLBACK = '/images/achievements/bronce/primer-premio.png';

export function getAchievementImage(code) {
  return ACHIEVEMENT_IMAGES[code] ?? FALLBACK;
}
