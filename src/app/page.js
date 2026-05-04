'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Anton } from 'next/font/google';
import Navbar from './components/Navbar';

const anton = Anton({ weight: '400', subsets: ['latin'], display: 'swap' });

// ── Stars ──────────────────────────────────────────────────────────────────────

function Stars({ score, size = 14 }) {
  if (!score) return null;
  const items = [];
  for (let i = 1; i <= 5; i++) {
    const t = score >= i ? 'full' : score >= i - 0.5 ? 'half' : 'empty';
    items.push(
      <span key={i} className={t === 'empty' ? 'text-[#3F3F46]' : 'text-[#A855F7]'} style={{ fontSize: size }}>
        {t === 'full' ? '★' : t === 'half' ? '½' : '☆'}
      </span>
    );
  }
  return <span className="flex items-center gap-px">{items}</span>;
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="flex-none w-36 md:w-44 flex flex-col gap-2 animate-pulse">
      <div className="aspect-[3/4] rounded-xl bg-[#1A1A1A]" />
      <div className="h-3 rounded-full bg-[#1A1A1A] w-3/4" />
      <div className="h-2.5 rounded-full bg-[#1A1A1A] w-1/2" />
    </div>
  );
}

function HeroSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-3 w-40 rounded-full bg-[#1A1A1A] mb-4" />
      <div className="h-14 w-80 rounded-lg bg-[#1A1A1A] mb-3" />
      <div className="h-10 w-64 rounded-lg bg-[#1A1A1A] mb-4" />
      <div className="flex gap-2 mb-4">
        <div className="h-7 w-20 rounded-full bg-[#1A1A1A]" />
        <div className="h-7 w-16 rounded-full bg-[#1A1A1A]" />
      </div>
      <div className="space-y-2 mb-6">
        <div className="h-3.5 w-full max-w-sm rounded-full bg-[#1A1A1A]" />
        <div className="h-3.5 w-4/5 max-w-xs rounded-full bg-[#1A1A1A]" />
        <div className="h-3.5 w-3/5 max-w-xs rounded-full bg-[#1A1A1A]" />
      </div>
      <div className="flex gap-3">
        <div className="h-11 w-28 rounded-full bg-[#1A1A1A]" />
        <div className="h-11 w-24 rounded-full bg-[#1A1A1A]" />
      </div>
    </div>
  );
}

// ── Hero Content ───────────────────────────────────────────────────────────────

function HeroContent({ featured }) {
  return (
    <>
      <span className="inline-flex items-center gap-1.5 text-[#A855F7] text-[11px] font-bold tracking-[0.2em] uppercase mb-3 md:mb-4">
        <span>✦</span> Destacado de la semana
      </span>
      <h1
        className={`${anton.className} text-white leading-none mb-4`}
        style={{ fontSize: 'clamp(2rem, 4.5vw, 4.2rem)', maxWidth: '560px' }}
      >
        {featured.name}
      </h1>
      {featured.genres?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {featured.genres.slice(0, 3).map(g => (
            <span
              key={g}
              className="px-3 py-1 rounded-full border border-[#3F3F46]/70 text-[#A1A1AA] text-xs backdrop-blur-sm"
            >
              {g}
            </span>
          ))}
        </div>
      )}
      {featured.summary && (
        <p className="text-[#A1A1AA] text-sm leading-relaxed mb-5" style={{ maxWidth: '460px' }}>
          {featured.summary.length > 200 ? featured.summary.slice(0, 200) + '…' : featured.summary}
        </p>
      )}
      {featured.average_score != null && (
        <div className="flex items-center gap-3 mb-6">
          <Stars score={featured.average_score} size={18} />
          <span className="text-white font-bold text-base">{featured.average_score}</span>
          <span className="text-[#71717A] text-sm">{featured.total_ratings} valoraciones</span>
        </div>
      )}
      <div className="flex gap-3 flex-wrap">
        <Link
          href={`/game/${featured.id}`}
          className="px-6 py-3 rounded-full bg-[#A855F7] text-white font-semibold text-sm hover:bg-[#9333EA] transition-colors"
        >
          Ver ficha
        </Link>
        <Link
          href={`/game/${featured.id}`}
          className="px-6 py-3 rounded-full border border-[#3F3F46] text-[#A1A1AA] font-semibold text-sm hover:border-[#A855F7] hover:text-[#A855F7] transition-colors"
        >
          Puntuar
        </Link>
      </div>
    </>
  );
}

// ── Game Card ──────────────────────────────────────────────────────────────────
// scoreInfo: { score: number, community?: boolean, total?: number }

function GameCard({ game, subtitle, badge, priority, scoreInfo }) {
  return (
    <Link
      href={`/game/${game.id}`}
      className="flex-none w-36 md:w-44 flex flex-col gap-2 group cursor-pointer"
    >
      <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-[#111111]">
        {game.cover ? (
          <Image
            src={game.cover}
            alt={game.name ?? ''}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width:640px) 144px,176px"
            priority={priority}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[#3F3F46] text-4xl">?</div>
        )}
        {badge && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[#A855F7] text-white text-[10px] font-bold uppercase tracking-wide">
            {badge}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl" />
      </div>
      <div className="flex flex-col gap-0.5 px-0.5">
        <span className="text-white text-xs md:text-[13px] font-semibold leading-snug line-clamp-2">
          {game.name}
        </span>
        {scoreInfo ? (
          <div className="flex items-center gap-1 flex-wrap">
            <Stars score={scoreInfo.score} size={11} />
            <span className="text-[#71717A] text-[11px]">{scoreInfo.score}</span>
            {scoreInfo.community && (
              <span className="px-1.5 py-px rounded-full bg-[#A855F7]/20 text-[#A855F7] text-[9px] font-bold leading-none">
                Comunidad
              </span>
            )}
          </div>
        ) : subtitle ? (
          <span className="text-[#71717A] text-[11px] leading-snug">{subtitle}</span>
        ) : null}
      </div>
    </Link>
  );
}

// ── Carousel ───────────────────────────────────────────────────────────────────

function Carousel({ items, renderItem, loading, skeletonCount = 8 }) {
  const ref    = useRef(null);
  const [atLeft,  setAtLeft]  = useState(true);
  const [atRight, setAtRight] = useState(false);

  function sync() {
    const el = ref.current;
    if (!el) return;
    setAtLeft(el.scrollLeft <= 8);
    setAtRight(el.scrollLeft >= el.scrollWidth - el.clientWidth - 8);
  }

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    sync();
    el.addEventListener('scroll', sync, { passive: true });
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', sync); ro.disconnect(); };
  }, [items, loading]);

  const scroll = (dir) => ref.current?.scrollBy({ left: dir * 360, behavior: 'smooth' });

  return (
    <div className="relative">
      {!atLeft && (
        <button
          onClick={() => scroll(-1)}
          className="hidden md:flex absolute -left-4 top-[35%] z-10 w-9 h-9 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] items-center justify-center text-white text-xl hover:bg-[#A855F7] hover:border-[#A855F7] transition-colors shadow-xl -translate-y-1/2"
        >
          ‹
        </button>
      )}
      {!atRight && !loading && items.length > 0 && (
        <button
          onClick={() => scroll(1)}
          className="hidden md:flex absolute -right-4 top-[35%] z-10 w-9 h-9 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] items-center justify-center text-white text-xl hover:bg-[#A855F7] hover:border-[#A855F7] transition-colors shadow-xl -translate-y-1/2"
        >
          ›
        </button>
      )}
      <div
        ref={ref}
        className="flex gap-4 overflow-x-auto pb-3"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {loading
          ? Array.from({ length: skeletonCount }, (_, i) => <CardSkeleton key={i} />)
          : items.length === 0
            ? <p className="text-[#71717A] text-sm py-4">No hay juegos disponibles</p>
            : items.map((item, i) => renderItem(item, i))
        }
      </div>
    </div>
  );
}

// ── Section ────────────────────────────────────────────────────────────────────

function Section({ title, subtitle, viewAllHref, delay, mounted, children }) {
  return (
    <section
      className="px-6 md:px-12 py-8 md:py-14 border-t border-[#1A1A1A] transition-all duration-700"
      style={{
        opacity:          mounted ? 1 : 0,
        transform:        mounted ? 'translateY(0)' : 'translateY(16px)',
        transitionDelay:  `${delay}ms`,
      }}
    >
      <div className="flex items-end justify-between mb-6 md:mb-8 gap-4">
        <div>
          <h2 className={`${anton.className} text-white text-2xl md:text-[32px] leading-tight`}>
            {title}
          </h2>
          {subtitle && <p className="text-[#71717A] text-sm mt-1">{subtitle}</p>}
        </div>
        {viewAllHref && (
          <Link href={viewAllHref} className="text-[#A855F7] text-sm hover:underline flex-shrink-0 pb-1">
            Ver todos →
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

// ── Review Card ────────────────────────────────────────────────────────────────

function ReviewCard({ item }) {
  const initials =
    (item.user.nombre?.charAt(0) ?? '?').toUpperCase() +
    (item.user.apellido?.charAt(0)?.toUpperCase() ?? '');

  return (
    <div className="bg-[#111111] border border-[#1A1A1A] rounded-xl p-4 flex flex-col gap-3 hover:border-[#2A2A2A] transition-colors h-full">
      <div className="flex items-center gap-3">
        {item.user.avatar_url ? (
          <Image
            src={item.user.avatar_url}
            alt={item.user.username}
            width={36}
            height={36}
            className="w-9 h-9 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center bg-[#7C3AED] text-white text-xs font-bold">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <Link
            href={`/user/${item.user.username}`}
            className="text-white text-sm font-semibold hover:text-[#A855F7] transition-colors"
          >
            @{item.user.username}
          </Link>
          <p className="text-[#71717A] text-xs truncate">{item.game.name}</p>
        </div>
        {item.game.cover && (
          <Link href={`/game/${item.game.id}`} className="flex-shrink-0">
            <Image
              src={item.game.cover}
              alt={item.game.name ?? ''}
              width={28}
              height={37}
              className="rounded object-cover"
              style={{ width: 28, height: 37 }}
            />
          </Link>
        )}
      </div>
      {item.metadata?.score && (
        <Stars score={parseFloat(item.metadata.score)} size={13} />
      )}
      <p className="text-[#A1A1AA] text-[13px] leading-relaxed line-clamp-3 flex-1">
        {item.metadata?.content}
      </p>
    </div>
  );
}

// ── HomePage ───────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  const [featured,        setFeatured]        = useState(null);
  const [featuredLoading, setFeaturedLoading] = useState(true);

  const [topRated,        setTopRated]        = useState([]);
  const [topRatedLoading, setTopRatedLoading] = useState(true);

  const [newReleases,        setNewReleases]        = useState([]);
  const [newReleasesLoading, setNewReleasesLoading] = useState(true);

  const [comingSoon,        setComingSoon]        = useState([]);
  const [comingSoonLoading, setComingSoonLoading] = useState(true);

  const [rpgGames,    setRpgGames]    = useState([]);
  const [rpgLoading,  setRpgLoading]  = useState(true);

  const [accionGames,   setAccionGames]   = useState([]);
  const [accionLoading, setAccionLoading] = useState(true);

  const [indieGames,   setIndieGames]   = useState([]);
  const [indieLoading, setIndieLoading] = useState(true);

  const [reviews,        setReviews]        = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  useEffect(() => {
    setMounted(true);

    const get = (url) => fetch(url).then(r => r.json()).catch(() => null);

    get('/api/discover/featured')
      .then(d => { if (d && !d.error) setFeatured(d); })
      .finally(() => setFeaturedLoading(false));

    get('/api/discover/top-rated')
      .then(d => { if (Array.isArray(d)) setTopRated(d); })
      .finally(() => setTopRatedLoading(false));

    get('/api/discover/new-releases')
      .then(d => { if (Array.isArray(d)) setNewReleases(d); })
      .finally(() => setNewReleasesLoading(false));

    get('/api/discover/coming-soon')
      .then(d => { if (Array.isArray(d)) setComingSoon(d); })
      .finally(() => setComingSoonLoading(false));

    get('/api/discover/by-genre/rpg')
      .then(d => { if (Array.isArray(d)) setRpgGames(d); })
      .finally(() => setRpgLoading(false));

    get('/api/discover/by-genre/accion')
      .then(d => { if (Array.isArray(d)) setAccionGames(d); })
      .finally(() => setAccionLoading(false));

    get('/api/discover/by-genre/indie')
      .then(d => { if (Array.isArray(d)) setIndieGames(d); })
      .finally(() => setIndieLoading(false));

    get('/api/feed')
      .then(d => {
        const items = d?.items?.filter(i => i.metadata?.content) ?? [];
        setReviews(items.slice(0, 4));
      })
      .finally(() => setReviewsLoading(false));
  }, []);

  const heroBg = featured?.screenshots?.[0] ?? featured?.cover ?? null;

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[520px] md:min-h-[78vh] flex items-end md:items-center overflow-hidden bg-[#0A0A0A]">
        {heroBg && (
          <Image
            src={heroBg}
            alt=""
            fill
            className="object-cover"
            priority
            quality={100}
            sizes="100vw"
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to right, #0A0A0A 35%, rgba(10,10,10,0.80) 60%, rgba(10,10,10,0.15) 100%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, #0A0A0A 0%, rgba(10,10,10,0.4) 30%, transparent 65%)',
          }}
        />

        <div
          className="relative z-10 px-6 md:px-12 py-14 md:py-20 transition-opacity duration-700"
          style={{ opacity: featuredLoading ? 0.3 : 1, maxWidth: '640px' }}
        >
          {featuredLoading ? (
            <HeroSkeleton />
          ) : featured ? (
            <HeroContent featured={featured} />
          ) : (
            <>
              <span className="inline-block text-[#A855F7] text-[11px] font-bold tracking-[0.2em] uppercase mb-3">
                ✦ Bienvenido
              </span>
              <h1
                className={`${anton.className} text-white leading-none mb-4`}
                style={{ fontSize: 'clamp(2rem,4.5vw,4.2rem)' }}
              >
                Descubre, puntúa<br />y comparte
              </h1>
              <p className="text-[#A1A1AA] text-sm leading-relaxed mb-6" style={{ maxWidth: '420px' }}>
                Tu comunidad de videojuegos. Lleva un registro de todo lo que juegas y descubre nuevos títulos.
              </p>
              <Link
                href="/search"
                className="px-6 py-3 rounded-full bg-[#A855F7] text-white font-semibold text-sm hover:bg-[#9333EA] transition-colors"
              >
                Explorar juegos
              </Link>
            </>
          )}
        </div>
      </section>

      {/* ── Mejor puntuados ──────────────────────────────────────────────────── */}
      <Section title="Mejor puntuados por la comunidad" delay={0} mounted={mounted}>
        <Carousel
          items={topRated}
          loading={topRatedLoading}
          renderItem={(game, i) => (
            <GameCard
              key={game.id}
              game={game}
              scoreInfo={
                game.source === 'community' && game.average_score != null
                  ? { score: game.average_score, community: true, total: game.total_ratings }
                  : null
              }
              subtitle={game.source !== 'community' ? (game.genres?.[0] ?? game.year?.toString()) : null}
              priority={i < 5}
            />
          )}
        />
      </Section>

      {/* ── Nuevos lanzamientos ───────────────────────────────────────────────── */}
      <Section title="Nuevos lanzamientos" delay={100} mounted={mounted}>
        <Carousel
          items={newReleases}
          loading={newReleasesLoading}
          renderItem={(game) => (
            <GameCard key={game.id} game={game} subtitle={game.release_date} />
          )}
        />
      </Section>

      {/* ── Próximamente ──────────────────────────────────────────────────────── */}
      <Section title="Próximamente" delay={200} mounted={mounted}>
        <Carousel
          items={comingSoon}
          loading={comingSoonLoading}
          renderItem={(game) => (
            <GameCard
              key={game.id}
              game={game}
              subtitle={game.release_date ? `Sale el ${game.release_date}` : null}
              badge="Pronto"
            />
          )}
        />
      </Section>

      {/* ── RPG ───────────────────────────────────────────────────────────────── */}
      <Section
        title="Lo mejor de RPG"
        viewAllHref="/search?q=RPG"
        delay={300}
        mounted={mounted}
      >
        <Carousel
          items={rpgGames}
          loading={rpgLoading}
          renderItem={(game) => (
            <GameCard
              key={game.id}
              game={game}
              scoreInfo={
                game.source === 'community' && game.average_score != null
                  ? { score: game.average_score, community: true }
                  : null
              }
              subtitle={game.source !== 'community' ? game.year?.toString() : null}
            />
          )}
        />
      </Section>

      {/* ── Acción ────────────────────────────────────────────────────────────── */}
      <Section
        title="Lo mejor de Acción"
        viewAllHref="/search?q=Accion"
        delay={400}
        mounted={mounted}
      >
        <Carousel
          items={accionGames}
          loading={accionLoading}
          renderItem={(game) => (
            <GameCard
              key={game.id}
              game={game}
              scoreInfo={
                game.source === 'community' && game.average_score != null
                  ? { score: game.average_score, community: true }
                  : null
              }
              subtitle={game.source !== 'community' ? game.year?.toString() : null}
            />
          )}
        />
      </Section>

      {/* ── Indie ─────────────────────────────────────────────────────────────── */}
      <Section
        title="Lo mejor de Indie"
        viewAllHref="/search?q=Indie"
        delay={500}
        mounted={mounted}
      >
        <Carousel
          items={indieGames}
          loading={indieLoading}
          renderItem={(game) => (
            <GameCard
              key={game.id}
              game={game}
              scoreInfo={
                game.source === 'community' && game.average_score != null
                  ? { score: game.average_score, community: true }
                  : null
              }
              subtitle={game.source !== 'community' ? game.year?.toString() : null}
            />
          )}
        />
      </Section>

      {/* ── Actividad de la comunidad ────────────────────────────────────────── */}
      <Section
        title="Actividad de la comunidad"
        subtitle="Las últimas reseñas de nuestra comunidad"
        viewAllHref="/feed"
        delay={600}
        mounted={mounted}
      >
        {reviewsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="bg-[#111111] rounded-xl p-4 animate-pulse flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#1A1A1A]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 rounded-full bg-[#1A1A1A] w-2/3" />
                    <div className="h-2.5 rounded-full bg-[#1A1A1A] w-1/2" />
                  </div>
                </div>
                <div className="space-y-2 flex-1">
                  <div className="h-2.5 rounded-full bg-[#1A1A1A] w-full" />
                  <div className="h-2.5 rounded-full bg-[#1A1A1A] w-4/5" />
                  <div className="h-2.5 rounded-full bg-[#1A1A1A] w-3/5" />
                </div>
              </div>
            ))}
          </div>
        ) : reviews.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {reviews.map(item => <ReviewCard key={item.id} item={item} />)}
          </div>
        ) : (
          <p className="text-[#71717A] text-sm py-4">
            Sé el primero en escribir una reseña.{' '}
            <Link href="/search" className="text-[#A855F7] hover:underline">Explorar juegos →</Link>
          </p>
        )}
      </Section>
    </div>
  );
}
