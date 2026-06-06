import { cache } from 'react';
import { Anton, Inter } from 'next/font/google';
import Image from 'next/image';
import Navbar from '@/app/components/Navbar';
import GameInteractions from '@/app/components/GameInteractions';
import PersonalRating from '@/app/components/PersonalRating';
import { queryIGDB, coverUrl } from '@/lib/igdb';
import { translateGenre, translatePlatform } from '@/lib/translations';
import { getTranslatedSummary } from '@/lib/game-translations';

const anton = Anton({ weight: '400', subsets: ['latin'], display: 'swap' });
const inter = Inter({ subsets: ['latin'], display: 'swap' });

const COVER_BLUR = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScAAAAAElFTkSuQmCC';

// Platform name (post-translatePlatform) → border color by console family.
// Fallback for unmapped platforms: '#2A2A2A' (neutral gray).
const PLATFORM_BORDER = {
  // PlayStation
  'PlayStation 5':    '#0070D1',
  'PlayStation 4':    '#0070D1',
  'PlayStation 3':    '#0070D1',
  'PlayStation 2':    '#0070D1',
  'PlayStation':      '#0070D1',
  'PS Vita':          '#0070D1',
  'PSP':              '#0070D1',
  // Xbox
  'Xbox Series X|S':  '#107C10',
  'Xbox One':         '#107C10',
  'Xbox 360':         '#107C10',
  'Xbox':             '#107C10',
  // Nintendo home
  'Nintendo Switch':  '#E60012',
  'Wii U':            '#E60012',
  'Wii':              '#E60012',
  'GameCube':         '#E60012',
  'Nintendo 64':      '#E60012',
  'SNES':             '#E60012',
  'NES':              '#E60012',
  // Nintendo handheld
  'Game Boy Advance': '#A60010',
  'Game Boy Color':   '#A60010',
  'Game Boy':         '#A60010',
  'Nintendo DS':      '#A60010',
  'Nintendo 3DS':     '#A60010',
  // PC
  'PC':               '#6E7B8B',
  // Sega (both spellings — translatePlatform maps to "Mega Drive", search uses "Mega Drive/Genesis")
  'Dreamcast':        '#0089CF',
  'Saturn':           '#0089CF',
  'Mega Drive':       '#0089CF',
  'Mega Drive/Genesis': '#0089CF',
  // Mobile
  'Android':          '#3DDC84',
  'iOS':              '#3DDC84',
};

// Memoized IGDB fetch — shared between generateMetadata and the page render
const fetchGame = cache(async (id) => {
  return queryIGDB(
    'games',
    `fields id,name,cover.image_id,screenshots.image_id,rating,rating_count,
     genres.name,platforms.name,first_release_date,summary,
     involved_companies.company.name,involved_companies.developer,involved_companies.publisher;
     where id = ${id};
     limit 1;`
  );
});

export async function generateMetadata({ params, searchParams }) {
  const { id } = await params;
  const ref = (await searchParams)?.ref ?? null; // e.g. "@username"
  try {
    const results = await fetchGame(id);
    if (!results?.length) return { title: 'Juego no encontrado' };
    const g = results[0];
    const cover = coverUrl(g.cover?.image_id, 'cover_big_2x');

    const baseDesc = g.summary ? g.summary.slice(0, 120) : 'Descubre más sobre este juego en myRankee.';
    const description = ref
      ? `${ref} ha puntuado ${g.name} en myRankee. ${baseDesc}`
      : baseDesc;
    const ogTitle = ref
      ? `${ref} recomienda ${g.name} — myRankee`
      : `${g.name} — myRankee`;

    return {
      title: g.name,
      description,
      openGraph: {
        type: 'article',
        title: ogTitle,
        description,
        images: cover ? [{ url: cover, width: 600, height: 900, alt: g.name }] : [],
        siteName: 'myRankee',
      },
      twitter: {
        card: 'summary_large_image',
        title: ogTitle,
        description,
        images: cover ? [cover] : [],
      },
    };
  } catch {
    return { title: 'Juego' };
  }
}

export default async function GameDetailPage({ params }) {
  const { id } = await params;

  let game = null;

  const [igdbResults] = await Promise.allSettled([fetchGame(id)]);

  let summaryTranslated = false;

  try {
    const results = igdbResults.status === 'fulfilled' ? igdbResults.value : null;
    if (results?.length) {
      const g = results[0];

      let summary = g.summary ?? null;
      if (summary) {
        const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 3000));
        const translation = await Promise.race([getTranslatedSummary(g.id, summary), timeout]);
        if (translation) {
          summary = translation.text;
          summaryTranslated = translation.translated;
        }
      }

      game = {
        id: g.id,
        name: g.name,
        cover: coverUrl(g.cover?.image_id, 'cover_big_2x'),
        heroBg: g.screenshots?.[0] ? coverUrl(g.screenshots[0].image_id, 'screenshot_big') : null,
        genres: g.genres?.map((gen) => translateGenre(gen.name)) ?? [],
        platforms: [...new Set(g.platforms?.map((p) => translatePlatform(p.name)) ?? [])],
        year: g.first_release_date ? new Date(g.first_release_date * 1000).getFullYear() : null,
        summary,
        developer: g.involved_companies?.find((c) => c.developer)?.company?.name ?? null,
      };
    }
  } catch {
    // game stays null
  }

  if (!game) {
    return (
      <div className={`${inter.className} min-h-screen bg-[#0A0A0A] w-full`}>
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <p className="text-[#71717A] text-sm">Juego no encontrado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${inter.className} min-h-screen bg-[#0A0A0A] w-full`}>

      <Navbar />

      {/* ── Hero Banner ── */}
      <div className="relative h-[300px] w-full overflow-hidden bg-[#141414]">
        {game.heroBg && (
          <Image src={game.heroBg} alt={game.name} fill sizes="100vw" className="object-cover" priority placeholder="blur" blurDataURL={COVER_BLUR} />
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 0%, #0A0A0A 85%)' }} />
      </div>

      {/* ── Game Info ── */}
      <div className="flex flex-col md:flex-row gap-5 md:gap-8 px-4 md:px-12 pb-10" style={{ marginTop: '-60px' }}>

        {/* Cover */}
        <div className="flex-shrink-0 flex justify-center md:block">
          <div className="relative w-[160px] h-[218px] md:w-[220px] md:h-[300px] rounded-xl overflow-hidden shadow-2xl bg-[#141414]">
            {game.cover && (
              <Image src={game.cover} alt={`${game.name} cover`} fill sizes="(max-width: 768px) 160px, 300px" className="object-cover" priority placeholder="blur" blurDataURL={COVER_BLUR} />
            )}
          </div>
        </div>

        {/* Details */}
        <div className="flex flex-col gap-4 md:pt-16 flex-1 min-w-0">

          {/* Title + meta */}
          <div className="flex flex-col gap-1">
            <h1 className={`${anton.className} text-white text-[36px] leading-tight`}>{game.name}</h1>
            <div className="flex items-center gap-3 flex-wrap">
              {game.developer && <span className="text-[#A855F7] text-sm">{game.developer}</span>}
              {game.developer && game.year && <span className="text-[#71717A] text-sm">•</span>}
              {game.year && <span className="text-[#71717A] text-[13px] font-mono">{game.year}</span>}
              {game.genres[0] && <><span className="text-[#71717A] text-sm">•</span><span className="text-[#71717A] text-[13px]">{game.genres[0]}</span></>}
            </div>
          </div>

          {/* Personal rating — client component, shows user's own score */}
          <PersonalRating gameId={game.id} />

          {/* Genre + platform tags */}
          <div className="flex flex-col gap-2">
            {game.genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {game.genres.map((name) => (
                  <span key={name} className="px-3 py-1 rounded-full bg-[#1A1A1A] text-[#71717A] text-[11px] font-mono border border-[#A855F7]/40">
                    {name}
                  </span>
                ))}
              </div>
            )}
            {game.platforms.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {game.platforms.slice(0, 3).map((name) => (
                  <span
                    key={name}
                    className="px-3 py-1 rounded-full bg-[#1A1A1A] text-[#71717A] text-[11px] font-mono border"
                    style={{ borderColor: PLATFORM_BORDER[name] ?? '#2A2A2A' }}
                  >
                    {name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          {game.summary && (
            <div className="flex flex-col gap-1.5">
              <h2 className={`${anton.className} text-white text-[18px]`}>Sinopsis</h2>
              <p className="text-[#71717A] text-sm leading-relaxed">{game.summary}</p>
              {!summaryTranslated && (
                <p className="text-[#3F3F46] text-[11px] font-mono">Sinopsis disponible solo en inglés</p>
              )}
            </div>
          )}

          <GameInteractions
            gameId={game.id}
            gameData={{ name: game.name, cover: game.cover, year: game.year, genre: game.genres[0] ?? null, summary: game.summary ?? null }}
          />

        </div>
      </div>

    </div>
  );
}
