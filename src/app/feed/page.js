'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Anton, Inter } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';
import Avatar from '@/app/components/Avatar';
import Navbar from '@/app/components/Navbar';
import ReviewCommentsSection from '@/app/components/ReviewCommentsSection';
import ShareModal from '@/app/components/ShareModal';
import ReportModal from '@/app/components/ReportModal';

const anton = Anton({ weight: '400', subsets: ['latin'], display: 'swap' });
const inter = Inter({ subsets: ['latin'], display: 'swap' });

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconHeart({ size = 15, filled = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
      fill={filled ? '#A855F7' : 'none'}
      stroke={filled ? '#A855F7' : 'currentColor'}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function IconMessage({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

// ── Star rating ───────────────────────────────────────────────────────────────

function StarRating({ value, size = 13 }) {
  if (!value) return null;
  const full  = Math.floor(value);
  const half  = value % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: full }).map((_, i) => (
        <svg key={`f${i}`} width={size} height={size} viewBox="0 0 24 24" fill="#A855F7" stroke="#A855F7" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
      {half && (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="2">
          <path d="M12 17.8 5.8 21 7 14.1 2 9.3l7-.8L12 2" fill="#A855F7" />
          <path d="M12 2v15.8" />
        </svg>
      )}
      {Array.from({ length: empty }).map((_, i) => (
        <svg key={`e${i}`} width={size} height={size} viewBox="0 0 24 24" fill="#3F3F46" stroke="#3F3F46" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}


// ── Backlog badge ─────────────────────────────────────────────────────────────

const BACKLOG_LABEL = { jugado: 'Jugado', jugando: 'Jugando', pendiente: 'Pendiente' };

// ── Feed card ─────────────────────────────────────────────────────────────────

function IconShare({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function IconFlag({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

function FeedCard({ item, token, currentUser }) {
  const [liked,         setLiked]        = useState(false);
  const [likesCount,    setLikesCount]   = useState(item.likes_count ?? 0);
  const [liking,        setLiking]       = useState(false);
  const [heartAnim,     setHeartAnim]    = useState(false);
  const [commentsOpen,  setCommentsOpen] = useState(false);
  const [commentCount,  setCommentCount] = useState(item.comments_count ?? 0);
  const [shareOpen,     setShareOpen]    = useState(false);
  const [reportOpen,    setReportOpen]   = useState(false);

  async function handleLike() {
    if (!token || liking || !item.review_id) return;
    setHeartAnim(true);
    setTimeout(() => setHeartAnim(false), 500);
    setLiking(true);
    try {
      const res = await fetch(`/api/reviews/${item.review_id}/like`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLiked(data.liked);
        setLikesCount(data.likes_count);
      }
    } finally {
      setLiking(false);
    }
  }

  const score  = item.metadata?.score   ?? null;
  const status = item.metadata?.status  ?? null;
  const text   = item.metadata?.content ?? null;

  return (
    <article className="card-hover flex flex-col gap-4 p-5 rounded-xl border border-[#1A1A1A] bg-[#0D0D0D]">
      <div className="flex items-center gap-3">
        <Link href={`/user/${item.user.username}`}>
          <Avatar user={item.user} />
        </Link>
        <div className="flex items-baseline gap-1.5 flex-wrap flex-1 min-w-0">
          <Link href={`/user/${item.user.username}`} className="text-white text-sm font-semibold hover:text-[#A855F7] transition-colors">
            @{item.user.username}
          </Link>
          <span className="text-[#71717A] text-sm">{item.action}</span>
        </div>
        <span className="ml-auto text-[#71717A] text-xs flex-shrink-0 font-mono">{item.time_ago}</span>
      </div>

      <Link href={`/game/${item.game.id}`} className="flex gap-4 bg-[#111111] rounded-xl p-4 border border-[#1A1A1A] hover:border-[#3F3F46] transition-colors">
        <div className="relative w-16 h-[86px] rounded-lg overflow-hidden flex-shrink-0 bg-[#1A1A1A]">
          {item.game.cover && (
            <Image src={item.game.cover} alt={item.game.name} fill sizes="64px" className="object-cover" />
          )}
        </div>
        <div className="flex flex-col gap-2 justify-center min-w-0">
          <span className="text-white text-sm font-semibold leading-tight">{item.game.name}</span>
          {score  != null && <StarRating value={score} size={13} />}
          {status && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#1A1A1A] text-[#A855F7] w-fit border border-[#A855F7]/30">
              {BACKLOG_LABEL[status] ?? status}
            </span>
          )}
          {text && (
            <p className="text-[#71717A] text-xs italic leading-relaxed line-clamp-2">&ldquo;{text}&rdquo;</p>
          )}
        </div>
      </Link>

      <div className="flex items-center gap-4">
        <button
          onClick={handleLike}
          disabled={!token || !item.review_id || liking}
          className={`relative flex items-center gap-1.5 text-xs transition-colors ${
            !item.review_id ? 'text-[#3F3F46] cursor-default'
            : liked         ? 'text-[#A855F7] cursor-pointer'
                            : 'text-[#71717A] hover:text-white cursor-pointer'
          }`}
        >
          <span className="relative inline-flex items-center justify-center">
            <span className={heartAnim ? 'heart-burst' : ''}>
              <IconHeart filled={liked} />
            </span>
            {heartAnim && (
              <span
                className="heart-ring absolute inset-[-4px] rounded-full pointer-events-none"
                style={{ border: `2px solid ${liked ? '#A855F7' : '#888'}` }}
              />
            )}
          </span>
          {likesCount}
        </button>
        {item.review_id ? (
          <button
            onClick={() => setCommentsOpen((v) => !v)}
            className={`flex items-center gap-1.5 text-xs transition-colors cursor-pointer ${
              commentsOpen ? 'text-[#A855F7]' : 'text-[#71717A] hover:text-white'
            }`}
          >
            <IconMessage />
            {commentCount}
          </button>
        ) : (
          <span className="flex items-center gap-1.5 text-[#3F3F46] text-xs">
            <IconMessage />
            0
          </span>
        )}
        {item.review_id && (
          <button
            onClick={() => setShareOpen(true)}
            className="flex items-center gap-1.5 text-[#71717A] hover:text-white text-xs transition-colors cursor-pointer ml-auto"
            title="Compartir reseña"
          >
            <IconShare />
          </button>
        )}
        {item.review_id && currentUser && currentUser.username !== item.user.username && (
          <button
            onClick={() => setReportOpen(true)}
            className="flex items-center gap-1.5 text-[#71717A] hover:text-red-400 text-xs transition-colors cursor-pointer"
            title="Reportar reseña"
          >
            <IconFlag />
          </button>
        )}
      </div>

      {reportOpen && item.review_id && (
        <ReportModal
          targetType="review"
          targetId={item.review_id}
          onClose={() => setReportOpen(false)}
        />
      )}

      {shareOpen && item.review_id && (
        <ShareModal
          gameId={item.game.id}
          gameName={item.game.name}
          gameCover={item.game.cover}
          gameYear={null}
          gameGenre={null}
          userScore={item.metadata?.score ?? null}
          reviewContent={item.metadata?.content ?? null}
          username={item.user.username}
          reviewId={item.review_id}
          onClose={() => setShareOpen(false)}
        />
      )}

      {commentsOpen && item.review_id && (
        <ReviewCommentsSection
          reviewId={item.review_id}
          reviewAuthorUsername={item.user.username}
          currentUsername={currentUser?.username ?? null}
          onCountChange={setCommentCount}
        />
      )}
    </article>
  );
}

// ── Sidebar: trending ─────────────────────────────────────────────────────────

function TrendingSidebar({ items }) {
  if (!items.length) return null;
  return (
    <section className="flex flex-col gap-4">
      <h2 className={`${anton.className} text-white text-xl`}>Tendencias</h2>
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <div key={item.rank} className="flex items-center gap-3">
            <span className="text-[#3F3F46] text-2xl font-bold w-6 text-right flex-shrink-0 leading-none">
              {item.rank}
            </span>
            <div className="flex flex-col gap-0.5 min-w-0">
              <Link href={`/game/${item.igdb_id}`} className="text-white text-sm font-medium truncate hover:text-[#A855F7] transition-colors">
                {item.title}
              </Link>
              <span className="text-[#A855F7] text-xs font-mono">
                {item.count} {item.count === 1 ? 'valoración' : 'valoraciones'} esta semana
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Sidebar: suggestions ──────────────────────────────────────────────────────

function SuggestionsSidebar({ initialItems, token }) {
  const [items, setItems] = useState(initialItems);

  useEffect(() => { setItems(initialItems); }, [initialItems]);

  async function handleFollow(username) {
    if (!token) return;
    try {
      const res = await fetch(`/api/users/${username}/follow`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setItems((prev) => prev.filter((u) => u.username !== username));
      }
    } catch { /* non-fatal */ }
  }

  if (!items.length) return null;

  return (
    <section className="flex flex-col gap-4">
      <h2 className={`${anton.className} text-white text-xl`}>Personas que seguir</h2>
      <div className="flex flex-col gap-3">
        {items.map((user) => (
          <div key={user.id} className="flex items-center gap-3">
            <Link href={`/user/${user.username}`}>
              <Avatar user={user} size={32} />
            </Link>
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <Link href={`/user/${user.username}`} className="text-white text-sm font-medium leading-none hover:text-[#A855F7] transition-colors">
                {user.nombre} {user.apellido}
              </Link>
              <span className="text-[#71717A] text-xs">{user.review_count} reseñas</span>
            </div>
            <button
              onClick={() => handleFollow(user.username)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full bg-[#A855F7] text-[#0A0A0A] text-xs font-semibold hover:bg-[#9333EA] transition-colors cursor-pointer min-h-[32px]"
            >
              Seguir
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Mobile: suggestions carousel ─────────────────────────────────────────────

function MobileSuggestionsBlock({ initialItems, token }) {
  const [items, setItems] = useState(initialItems);
  useEffect(() => { setItems(initialItems); }, [initialItems]);

  async function handleFollow(username) {
    if (!token) return;
    try {
      const res = await fetch(`/api/users/${username}/follow`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setItems((prev) => prev.filter((u) => u.username !== username));
    } catch { /* non-fatal */ }
  }

  if (!items.length) return null;

  return (
    <div className="md:hidden rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] p-4 flex flex-col gap-3">
      <h2 className={`${anton.className} text-white text-lg`}>Personas que seguir</h2>
      <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {items.map((user) => (
          <div key={user.id} className="flex flex-col items-center gap-2.5 p-3 rounded-xl border border-[#1A1A1A] bg-[#111111] w-[112px] flex-shrink-0">
            <Link href={`/user/${user.username}`}>
              <Avatar user={user} size={40} />
            </Link>
            <div className="flex flex-col items-center gap-0.5 w-full">
              <Link href={`/user/${user.username}`} className="text-white text-xs font-medium leading-tight truncate w-full text-center hover:text-[#A855F7] transition-colors">
                {user.nombre}
              </Link>
              <span className="text-[#71717A] text-[10px]">{user.review_count} reseñas</span>
            </div>
            <button
              onClick={() => handleFollow(user.username)}
              className="px-2 py-1 rounded-full bg-[#A855F7] text-[#0A0A0A] text-xs font-semibold hover:bg-[#9333EA] transition-colors cursor-pointer w-full"
            >
              Seguir
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Mobile: trending block ────────────────────────────────────────────────────

function MobileTrendingBlock({ items }) {
  if (!items.length) return null;
  return (
    <div className="md:hidden rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] p-4 flex flex-col gap-3">
      <h2 className={`${anton.className} text-white text-lg`}>Tendencias</h2>
      <div className="flex flex-col gap-2.5">
        {items.map((item) => (
          <div key={item.rank} className="flex items-center gap-3">
            <span className="text-[#3F3F46] text-xl font-bold w-5 text-right flex-shrink-0 leading-none">
              {item.rank}
            </span>
            <div className="flex flex-col gap-0.5 min-w-0">
              <Link href={`/game/${item.igdb_id}`} className="text-white text-sm font-medium truncate hover:text-[#A855F7] transition-colors">
                {item.title}
              </Link>
              <span className="text-[#A855F7] text-xs font-mono">
                {item.count} {item.count === 1 ? 'valoración' : 'valoraciones'} esta semana
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Interleave helper ─────────────────────────────────────────────────────────

function buildInterleavedFeed(posts) {
  const entries = [];
  let suggestionsInserted = false;
  let trendingInserted    = false;

  posts.forEach((post, i) => {
    entries.push({ type: 'post', item: post, postIndex: i });
    if (i === 2) { entries.push({ type: 'suggestions' }); suggestionsInserted = true; }
    if (i === 5) { entries.push({ type: 'trending' });    trendingInserted    = true; }
  });

  if (!suggestionsInserted) entries.push({ type: 'suggestions' });
  if (!trendingInserted)    entries.push({ type: 'trending' });

  return entries;
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TABS      = ['Reciente', 'Popular', 'Siguiendo'];
const TAB_PARAM = { Reciente: 'reciente', Popular: 'popular', Siguiendo: 'siguiendo' };

export default function FeedPage() {
  const router = useRouter();
  const [activeTab,   setActiveTab]   = useState('Reciente');
  const [items,       setItems]       = useState([]);
  const [trending,    setTrending]    = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [token,       setToken]       = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [apiError,    setApiError]    = useState(null);
  const [noFollows,   setNoFollows]   = useState(false);

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) { router.push('/login'); return; }
    setToken(t);
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setCurrentUser(d?.user ?? null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setApiError(null);
    setNoFollows(false);
    const tab = TAB_PARAM[activeTab];
    fetch(`/api/feed?tab=${tab}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body?.error ?? `Error ${r.status}`);
        }
        return r.json();
      })
      .then((data) => {
        setItems(data.items ?? []);
        setTrending(data.trending ?? []);
        setSuggestions(data.suggestions ?? []);
        setNoFollows(data.no_follows ?? false);
      })
      .catch((err) => setApiError(err.message))
      .finally(() => setLoading(false));
  }, [activeTab, token]);

  // ── Empty state per tab ───────────────────────────────────────────────────

  function renderEmpty() {
    if (activeTab === 'Siguiendo' && noFollows) {
      return (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#3F3F46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <div className="flex flex-col gap-1">
            <p className="text-white text-sm font-medium">Aún no sigues a nadie</p>
            <p className="text-[#71717A] text-sm">¡Sigue a otros usuarios para ver su actividad aquí!</p>
          </div>
          <Link
            href="/lists"
            className="px-5 py-2.5 rounded-full bg-[#A855F7] text-[#0A0A0A] text-sm font-semibold hover:bg-[#9333EA] transition-colors min-h-[44px] flex items-center"
          >
            Descubrir usuarios
          </Link>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#3F3F46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <div className="flex flex-col gap-1">
          <p className="text-white text-sm font-medium">No hay actividad reciente</p>
          <p className="text-[#71717A] text-sm">
            {activeTab === 'Siguiendo'
              ? 'Los usuarios que sigues aún no han publicado actividad.'
              : '¡Sigue a otros usuarios o valora juegos para ver actividad aquí!'}
          </p>
        </div>
        <Link
          href="/search"
          className="px-5 py-2.5 rounded-full bg-[#A855F7] text-[#0A0A0A] text-sm font-semibold hover:bg-[#9333EA] transition-colors min-h-[44px] flex items-center"
        >
          Explorar juegos
        </Link>
      </div>
    );
  }

  return (
    <div className={`${inter.className} min-h-screen bg-[#0A0A0A]`}>
      <Navbar />

      <div className="pt-16 flex gap-8 max-w-5xl mx-auto px-6 py-8">

        {/* ── Main feed ── */}
        <main className="flex-1 min-w-0 flex flex-col gap-6">
          <h1 className={`${anton.className} text-white text-4xl leading-none`}>Tu Feed</h1>

          {/* Tabs */}
          <div className="flex border-b border-[#1A1A1A]">
            {TABS.map((tab) => {
              const active = tab === activeTab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 pb-3 text-sm font-medium transition-colors cursor-pointer border-b-2 -mb-px ${
                    active
                      ? 'text-white border-[#A855F7]'
                      : 'text-[#71717A] border-transparent hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {/* Cards */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <span className="text-[#71717A] text-sm">Cargando actividad...</span>
            </div>
          ) : apiError ? (
            <div className="flex items-center justify-center py-24">
              <p className="text-red-400 text-sm text-center font-mono">{apiError}</p>
            </div>
          ) : items.length === 0 ? (
            <>
              {renderEmpty()}
              <div className="md:hidden flex flex-col gap-4">
                <MobileSuggestionsBlock initialItems={suggestions} token={token} />
                <MobileTrendingBlock items={trending} />
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-4">
              {buildInterleavedFeed(items).map((entry) => {
                if (entry.type === 'post') {
                  return (
                    <div key={entry.item.id} className="card-fade-up" style={{ animationDelay: `${entry.postIndex * 55}ms` }}>
                      <FeedCard item={entry.item} token={token} currentUser={currentUser} />
                    </div>
                  );
                }
                if (entry.type === 'suggestions') {
                  return <MobileSuggestionsBlock key="mobile-suggestions" initialItems={suggestions} token={token} />;
                }
                if (entry.type === 'trending') {
                  return <MobileTrendingBlock key="mobile-trending" items={trending} />;
                }
                return null;
              })}
            </div>
          )}
        </main>

        {/* ── Sidebar ── */}
        <aside className="hidden md:flex w-72 flex-shrink-0 flex-col gap-8 pt-1">
          <TrendingSidebar items={trending} />
          <SuggestionsSidebar initialItems={suggestions} token={token} />
        </aside>

      </div>
    </div>
  );
}
