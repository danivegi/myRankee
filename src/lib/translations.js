// IGDB genre names → Spanish
export const GENRE_TRANSLATIONS = {
  'Adventure':                          'Aventura',
  'Role-playing (RPG)':                 'RPG',
  'Shooter':                            'Shooter',
  'Simulator':                          'Simulación',
  'Strategy':                           'Estrategia',
  'Puzzle':                             'Puzzle',
  'Indie':                              'Indie',
  'Platform':                           'Plataformas',
  'Fighting':                           'Lucha',
  'Racing':                             'Carreras',
  'Sport':                              'Deportes',
  'Music':                              'Musical',
  'Arcade':                             'Arcade',
  'Pinball':                            'Pinball',
  'Turn-based strategy (TBS)':          'Estrategia por turnos',
  'Real Time Strategy (RTS)':           'Estrategia en tiempo real',
  'Tactical':                           'Táctico',
  "Hack and slash/Beat 'em up":         'Hack and Slash',
  'Card & Board Game':                  'Cartas y Mesa',
  'MOBA':                               'MOBA',
  'Visual Novel':                       'Novela Visual',
  'Point-and-click':                    'Aventura gráfica',
  'Quiz/Trivia':                        'Trivial',
};

// IGDB platform full names — only the two minor cleanups requested.
// Everything else returns the original IGDB name unchanged.
export const PLATFORM_TRANSLATIONS = {
  'PC (Microsoft Windows)':  'PC',
  'Sega Mega Drive/Genesis': 'Mega Drive',
};

/** Translate an IGDB genre name to Spanish. Returns original if no mapping found. */
export function translateGenre(name) {
  return GENRE_TRANSLATIONS[name] ?? name;
}

/** Translate an IGDB platform name. Returns cleaned name for the two special cases, original otherwise. */
export function translatePlatform(name) {
  return PLATFORM_TRANSLATIONS[name] ?? name;
}

/** Translate an array of IGDB genre names to Spanish. */
export function translateGenres(names) {
  return (names ?? []).map(translateGenre);
}

/** Translate an array of IGDB platform names. */
export function translatePlatforms(names) {
  return (names ?? []).map(translatePlatform);
}
