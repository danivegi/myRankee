import { cache } from 'react';
import { Anton, Inter } from 'next/font/google';
import Image from 'next/image';
import Navbar from '@/app/components/Navbar';
import GameInteractions from '@/app/components/GameInteractions';
import { queryIGDB, coverUrl } from '@/lib/igdb';
import pool from '@/lib/db';
import { translateGenre, translatePlatform } from '@/lib/translations';
import { getTranslatedSummary } from '@/lib/game-translations';

const anton = Anton({ weight: '400', subsets: ['latin'], display: 'swap' });
const inter = Inter({ subsets: ['latin'], display: 'swap' });

const COVER_BLUR = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScAAAAAElFTkSuQmCC';

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

// ── Inline star renderer (server-safe) ───────────────────────────────────────

function CommunityStars({ score, size = 20 }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const t = score >= i ? 'full' : score >= i - 0.5 ? 'half' : 'empty';
    stars.push(
      <span key={i} style={{ color: t === 'empty' ? '#3F3F46' : '#A855F7', fontSize: size, lineHeight: 1 }}>
        {t === 'full' ? '★' : t === 'half' ? '½' : '☆'}
      </span>
    );
  }
  return <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>{stars}</span>;
}

export default async function GameDetailPage({ params }) {
  const { id } = await params;

  let game = null;
  let communityRating = null;

  const [igdbResults, communityRes] = await Promise.allSettled([
    fetchGame(id),
    pool.query(
      `SELECT ROUND(AVG(score)::numeric, 1) AS avg_score, COUNT(*)::int AS total
       FROM ratings WHERE igdb_game_id = $1`,
      [id]
    ),
  ]);

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

  if (communityRes.status === 'fulfilled') {
    const row = communityRes.value.rows[0];
    if (row.total > 0) {
      communityRating = { avg: parseFloat(row.avg_score), total: row.total };
    }
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
      <div className="flex gap-8 px-12 pb-10" style={{ marginTop: '-60px' }}>

        {/* Cover */}
        <div className="flex-shrink-0">
          <div className="relative w-[220px] h-[300px] rounded-xl overflow-hidden shadow-2xl bg-[#141414]">
            {game.cover && (
              <Image src={game.cover} alt={`${game.name} cover`} fill sizes="(max-width: 768px) 100vw, 300px" className="object-cover" priority placeholder="blur" blurDataURL={COVER_BLUR} />
            )}
          </div>
        </div>

        {/* Details */}
        <div className="flex flex-col gap-4 pt-16 flex-1 min-w-0">

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

          {/* Community score */}
          {communityRating ? (
            <div className="flex items-center gap-3">
              <CommunityStars score={communityRating.avg} size={22} />
              <span className="text-white font-bold text-2xl">{communityRating.avg}</span>
              <div className="flex flex-col leading-tight">
                <span className="text-[#71717A] text-xs">{communityRating.total} {communityRating.total === 1 ? 'valoración' : 'valoraciones'}</span>
                <span className="text-[#A855F7] text-[10px] font-mono uppercase tracking-wide">myRankee</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              <p className="text-[#71717A] text-sm">Aún no hay puntuaciones</p>
              <p className="text-[#A855F7] text-xs">¡Sé el primero en puntuar!</p>
            </div>
          )}

          {/* Genre + platform tags */}
          <div className="flex items-center gap-2 flex-wrap">
            {[
              ...game.genres.map((name) => ({ type: 'genre', name })),
              ...game.platforms.slice(0, 3).map((name) => ({ type: 'platform', name })),
            ].map(({ type, name }) => (
              <span key={`${type}-${name}`} className="px-3 py-1 rounded-full bg-[#1A1A1A] text-[#71717A] text-[11px] font-mono border border-[#1A1A1A]">
                {name}
              </span>
            ))}
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
