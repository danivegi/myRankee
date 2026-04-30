import { queryIGDB, coverUrl } from '@/lib/igdb';
import { translateGenre, translatePlatform } from '@/lib/translations';

// Mapping de nombres de plataforma → IDs de IGDB
const PLATFORM_IDS = {
  'PlayStation 5':      167,
  'PlayStation 4':       48,
  'PlayStation 3':        9,
  'PlayStation 2':        8,
  'PlayStation':          7,
  'PS Vita':             46,
  'PSP':                 38,
  'Xbox Series X|S':    169,
  'Xbox One':            49,
  'Xbox 360':            12,
  'Xbox':                11,
  'Nintendo Switch':    130,
  'Wii U':               41,
  'Wii':                  5,
  'GameCube':            21,
  'Nintendo 64':          4,
  'SNES':                19,
  'NES':                 18,
  'Nintendo 3DS':        37,
  'Game Boy Advance':    24,
  'Game Boy Color':      22,
  'Game Boy':            33,
  'PC':                   6,
  'Mac':                 14,
  'Linux':                3,
  'Dreamcast':           23,
  'Saturn':              32,
  'Mega Drive/Genesis':  29,
  'Android':             34,
  'iOS':                 39,
};

export async function GET(request) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get('q');
  if (!q?.trim()) return Response.json([]);

  const now = Math.floor(Date.now() / 1000);

  // Construir filtro de plataformas si hay seleccionadas
  const selectedPlatforms = searchParams.get('platforms')?.split(',').filter(Boolean) ?? [];
  const platformIds = selectedPlatforms
    .map((name) => PLATFORM_IDS[name])
    .filter(Boolean);

  const platformFilter = platformIds.length > 0
    ? `& platforms = (${platformIds.join(',')})`
    : '';

  const results = await queryIGDB(
    'games',
    `fields id,name,cover.image_id,rating,genres.name,platforms.name,first_release_date;
     search "${q.replace(/"/g, '')}";
     where first_release_date != null & first_release_date < ${now} & version_parent = null ${platformFilter};
     limit 20;`
  );

  const games = results
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .map((g) => ({
      id: g.id,
      name: g.name,
      cover: coverUrl(g.cover?.image_id, 'cover_big'),
      genres: g.genres?.map((gen) => translateGenre(gen.name)) ?? [],
      platforms: g.platforms?.map((p) => translatePlatform(p.name)) ?? [],
      year: g.first_release_date
        ? new Date(g.first_release_date * 1000).getFullYear()
        : null,
    }));

  return Response.json(games);
}
