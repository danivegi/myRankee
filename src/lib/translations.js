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

// IGDB platform full names → unified display names.
// All PC-variant platforms collapse to a single "PC".
export const PLATFORM_TRANSLATIONS = {
  'PC (Microsoft Windows)':  'PC',
  'Windows':                 'PC',
  'Mac':                     'PC',
  'macOS':                   'PC',
  'Linux':                   'PC',
  'PC DOS':                  'PC',
  'DOS':                     'PC',
  'Sega Mega Drive/Genesis': 'Mega Drive',
};

/** Translate an IGDB genre name to Spanish. Returns original if no mapping found. */
export function translateGenre(name) {
  return GENRE_TRANSLATIONS[name] ?? name;
}

/** Translate an IGDB platform name. Returns unified name or original if no mapping found. */
export function translatePlatform(name) {
  return PLATFORM_TRANSLATIONS[name] ?? name;
}

/** Translate an array of IGDB genre names to Spanish. */
export function translateGenres(names) {
  return (names ?? []).map(translateGenre);
}

/** Translate and deduplicate an array of IGDB platform names. */
export function translatePlatforms(names) {
  return [...new Set((names ?? []).map(translatePlatform))];
}
