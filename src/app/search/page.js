'use client';

import { useState, useEffect } from 'react';
import { Anton, Inter } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';

const anton = Anton({ weight: '400', subsets: ['latin'], display: 'swap' });
const inter = Inter({ subsets: ['latin'], display: 'swap' });

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconSearch({ size = 20, color = '#71717A' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconStar({ size = 14, filled = true }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? '#A855F7' : 'none'} stroke="#A855F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function IconFilter({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="11" y1="18" x2="13" y2="18" />
    </svg>
  );
}

function IconX({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ── Static filter data ────────────────────────────────────────────────────────

const GENRE_PILLS = ['Todos', 'RPG', 'Acción', 'Aventura', 'Estrategia', 'Indie', 'Deportes', 'Terror'];

const PLATFORMS = [
  'PlayStation 5', 'PlayStation 4', 'PlayStation 3', 'PlayStation 2', 'PlayStation',
  'PS Vita', 'PSP',
  'Xbox Series X|S', 'Xbox One', 'Xbox 360', 'Xbox',
  'Nintendo Switch', 'Wii U', 'Wii', 'GameCube', 'Nintendo 64', 'SNES', 'NES',
  'Nintendo 3DS', 'Game Boy Advance', 'Game Boy Color', 'Game Boy',
  'PC', 'Mac', 'Linux',
  'Dreamcast', 'Saturn', 'Mega Drive/Genesis',
  'Android', 'iOS',
];

const RATING_OPTIONS = [{ label: '4+', stars: 4 }, { label: '3+', stars: 3 }, { label: '2+', stars: 2 }];
const YEAR_OPTIONS   = ['2024', '2023', '2022'];
const SORT_OPTIONS   = ['Relevancia', 'Puntuación', 'Recientes', 'Nombre'];

const DEFAULT_RATING = '4+';
const DEFAULT_YEAR   = '2024';

// ── Avatar helper ─────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#A855F7', '#7C3AED', '#9333EA', '#6D28D9', '#8B5CF6'];
function colorFor(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Pill({ active, onClick, children, mono = false }) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-5 py-2 rounded-full text-sm whitespace-nowrap transition-colors cursor-pointer',
        mono ? 'font-mono text-[11px]' : 'font-medium text-[14px]',
        active
          ? 'bg-[#A855F7] text-[#0A0A0A]'
          : 'border border-[#1A1A1A] text-[#71717A] hover:border-[#A855F7] hover:text-white',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function StarRow({ count, size = 14 }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: count }).map((_, i) => <IconStar key={i} size={size} filled />)}
    </div>
  );
}

function PlatformCheckbox({ platform, checked, onToggle }) {
  return (
    <button onClick={() => onToggle(platform)} className="flex items-center gap-2.5 cursor-pointer group flex-shrink-0 min-h-[36px]">
      <span
        className="flex items-center justify-center w-[18px] h-[18px] rounded flex-shrink-0 transition-colors"
        style={{ background: checked ? 'rgba(168,85,247,0.2)' : 'transparent', border: `1.5px solid ${checked ? '#A855F7' : '#71717A'}` }}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1.5 5L4 7.5L8.5 2.5" stroke="#A855F7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="text-[13px] transition-colors text-left" style={{ color: checked ? '#FFFFFF' : '#71717A' }}>{platform}</span>
    </button>
  );
}

function RatingRadio({ label, stars, selected, onSelect }) {
  return (
    <button onClick={() => onSelect(label)} className="flex items-center gap-2.5 cursor-pointer min-h-[36px]">
      <span
        className="flex items-center justify-center w-4 h-4 rounded-full flex-shrink-0"
        style={{ border: `1.5px solid ${selected ? '#A855F7' : '#71717A'}` }}
      >
        {selected && <span className="w-2 h-2 rounded-full bg-[#A855F7]" />}
      </span>
      <div className="flex items-center gap-1">
        <StarRow count={stars} size={14} />
        <span className="text-[#71717A] font-mono text-[11px] ml-0.5">{label}</span>
      </div>
    </button>
  );
}

function GameCard({ game, index }) {
  return (
    <Link
      href={`/game/${game.id}`}
      className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-[#111111] transition-colors group cursor-pointer"
    >
      <span className="text-[#71717A] font-mono text-[13px] w-5 text-right flex-shrink-0">{index + 1}</span>
      <div className="relative w-10 h-14 rounded-md overflow-hidden bg-[#1A1A1A] flex-shrink-0">
        {game.cover
          ? <Image src={game.cover} alt={game.name} fill className="object-cover" sizes="40px" />
          : <div className="w-full h-full bg-[#1A1A1A]" />
        }
      </div>
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <span className="text-white text-sm font-semibold leading-snug group-hover:text-[#A855F7] transition-colors line-clamp-1">
          {game.name}
        </span>
        <div className="flex items-center gap-2">
          {game.genres[0] && <span className="text-[#71717A] font-mono text-[11px]">{game.genres[0]}</span>}
          {game.genres[0] && game.year && <span className="text-[#71717A] text-xs">•</span>}
          {game.year && <span className="text-[#71717A] font-mono text-[11px]">{game.year}</span>}
        </div>
      </div>
      {game.platforms[0] && (
        <span className="text-[#71717A] font-mono text-[11px] flex-shrink-0 hidden sm:block">
          {game.platforms[0]}
        </span>
      )}
    </Link>
  );
}

function GridCard({ game }) {
  return (
    <Link href={`/game/${game.id}`} className="flex flex-col gap-2 rounded-xl overflow-hidden group cursor-pointer">
      <div className="relative w-full rounded-xl overflow-hidden bg-[#141414]" style={{ aspectRatio: '3/4' }}>
        {game.cover
          ? <Image src={game.cover} alt={game.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width: 768px) 50vw, 25vw" />
          : <div className="w-full h-full bg-[#1A1A1A]" />
        }
      </div>
      <div className="flex flex-col gap-0.5 px-1">
        <span className="text-white text-[13px] font-semibold leading-snug group-hover:text-[#A855F7] transition-colors line-clamp-1">
          {game.name}
        </span>
        <div className="flex items-center gap-1.5">
          {game.genres[0] && <span className="text-[#71717A] font-mono text-[10px]">{game.genres[0]}</span>}
          {game.genres[0] && game.year && <span className="text-[#71717A] text-[10px]">•</span>}
          {game.year && <span className="text-[#71717A] font-mono text-[10px]">{game.year}</span>}
        </div>
      </div>
    </Link>
  );
}

// ── User card ─────────────────────────────────────────────────────────────────

function UserCard({ user, token }) {
  const [following, setFollowing] = useState(false);
  const [loading,   setLoading]   = useState(false);

  async function toggleFollow() {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${user.username}/follow`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFollowing(data.following);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-5 rounded-xl border border-[#1A1A1A] bg-[#111111] hover:border-[#2A2A2A] transition-colors">
      <Link href={`/user/${user.username}`} className="flex flex-col items-center gap-2 text-center">
        {user.avatar_url ? (
          <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
            <Image src={user.avatar_url} alt={user.username} fill className="object-cover" sizes="64px" />
          </div>
        ) : (
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0 select-none"
            style={{ backgroundColor: colorFor(user.username) }}
          >
            {user.nombre?.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex flex-col gap-0.5">
          <span className="text-white text-sm font-semibold leading-snug hover:text-[#A855F7] transition-colors">
            {user.nombre} {user.apellido}
          </span>
          <span className="text-[#71717A] font-mono text-xs">@{user.username}</span>
        </div>
        {user.bio && (
          <p className="text-[#71717A] text-xs leading-relaxed line-clamp-1 max-w-full">{user.bio}</p>
        )}
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-[#71717A]">
            <span className="text-white font-semibold">{user.total_ratings ?? 0}</span> juegos
          </span>
          <span className="text-[#71717A]">
            <span className="text-white font-semibold">{user.total_reviews ?? 0}</span> reseñas
          </span>
        </div>
      </Link>

      {token && (
        <button
          onClick={toggleFollow}
          disabled={loading}
          className={[
            'group w-full py-2 rounded-full text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 min-h-[36px] flex items-center justify-center gap-1.5',
            following
              ? 'border border-[#3F3F46] text-white hover:border-red-500 hover:text-red-400'
              : 'bg-[#A855F7] text-[#0A0A0A] hover:bg-[#9333EA]',
          ].join(' ')}
        >
          {following ? (
            <>
              <svg className="hidden group-hover:block flex-shrink-0" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              <span className="group-hover:hidden">Siguiendo</span>
              <span className="hidden group-hover:inline">Dejar de seguir</span>
            </>
          ) : 'Seguir'}
        </button>
      )}
    </div>
  );
}

// ── Filter bottom sheet (mobile) ──────────────────────────────────────────────

function FilterBottomSheet({ platforms, togglePlatform, activeRating, setActiveRating, activeYear, setActiveYear, onClose, onClear }) {
  const [opening, setOpening] = useState(true);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setOpening(false)));
  }, []);

  function handleClose() {
    setClosing(true);
    setTimeout(onClose, 300);
  }

  function handleClear() {
    onClear();
    handleClose();
  }

  const sheetTranslate = opening || closing ? 'translateY(100%)' : 'translateY(0)';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ backgroundColor: opening || closing ? 'transparent' : 'rgba(0,0,0,0.7)', transition: 'background-color 0.3s' }}
      onClick={handleClose}
    >
      <div
        className="w-full rounded-t-2xl flex flex-col"
        style={{
          backgroundColor: '#111111',
          maxHeight: '85vh',
          transform: sheetTranslate,
          transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
          borderTop: '1px solid #1A1A1A',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-[#3F3F46]" />
        </div>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1A1A1A] flex-shrink-0">
          <span className={`${anton.className} text-white text-xl`}>Filtros</span>
          <button onClick={handleClose} className="w-9 h-9 flex items-center justify-center text-[#71717A] hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-[#1A1A1A]">
            <IconX size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-6 min-h-0">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-white text-sm font-semibold">Plataforma</span>
              {platforms.length > 0 && (
                <button onClick={() => togglePlatform(null)} className="text-[#A855F7] font-mono text-[11px] hover:underline cursor-pointer">
                  Limpiar
                </button>
              )}
            </div>
            <div className="flex flex-col gap-1 max-h-[216px] overflow-y-auto pr-1 scrollbar-thin">
              {PLATFORMS.map((p) => (
                <PlatformCheckbox key={p} platform={p} checked={platforms.includes(p)} onToggle={togglePlatform} />
              ))}
            </div>
          </div>
          <div className="h-px w-full bg-[#1A1A1A]" />
          <div className="flex flex-col gap-3">
            <span className="text-white text-sm font-semibold">Puntuación mínima</span>
            <div className="flex flex-col gap-1">
              {RATING_OPTIONS.map(({ label, stars }) => (
                <RatingRadio key={label} label={label} stars={stars} selected={activeRating === label} onSelect={setActiveRating} />
              ))}
            </div>
          </div>
          <div className="h-px w-full bg-[#1A1A1A]" />
          <div className="flex flex-col gap-3">
            <span className="text-white text-sm font-semibold">Año de lanzamiento</span>
            <div className="flex items-center gap-2 flex-wrap">
              {YEAR_OPTIONS.map((y) => (
                <Pill key={y} active={activeYear === y} mono onClick={() => setActiveYear(y)}>{y}</Pill>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-5 pt-4 pb-6 border-t border-[#1A1A1A] flex-shrink-0" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          <button onClick={handleClear} className="flex-1 py-3 rounded-xl border border-[#1A1A1A] text-white text-sm font-semibold hover:bg-[#1A1A1A] transition-colors cursor-pointer min-h-[44px]">
            Limpiar filtros
          </button>
          <button onClick={handleClose} className="flex-1 py-3 rounded-xl bg-[#A855F7] text-[#0A0A0A] text-sm font-bold hover:bg-[#9333EA] transition-colors cursor-pointer min-h-[44px]">
            Aplicar filtros
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SearchPage() {
  const [query,        setQuery]        = useState('');
  const [activeTab,    setActiveTab]    = useState('Juegos'); // 'Juegos' | 'Usuarios'
  const [gameResults,  setGameResults]  = useState([]);
  const [userResults,  setUserResults]  = useState([]);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [activeGenre,  setActiveGenre]  = useState('Todos');
  const [platforms,    setPlatforms]    = useState([]);
  const [activeRating, setActiveRating] = useState(DEFAULT_RATING);
  const [activeYear,   setActiveYear]   = useState(DEFAULT_YEAR);
  const [activeSort,   setActiveSort]   = useState('Relevancia');
  const [view,         setView]         = useState('list');
  const [sheetOpen,    setSheetOpen]    = useState(false);
  const [token,        setToken]        = useState(null);

  const activeFilterCount =
    platforms.length +
    (activeRating !== DEFAULT_RATING ? 1 : 0) +
    (activeYear   !== DEFAULT_YEAR   ? 1 : 0);

  // Read initial state from URL on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    setToken(token);

    const params = new URLSearchParams(window.location.search);
    const q   = params.get('q');
    const tab = params.get('tab');
    if (q)   setQuery(q);
    if (tab === 'usuarios') setActiveTab('Usuarios');
  }, []);

  // Fetch game results
  useEffect(() => {
    if (!query.trim()) { setGameResults([]); return; }
    const timer = setTimeout(async () => {
      setGamesLoading(true);
      try {
        const params = new URLSearchParams({ q: query });
        if (platforms.length > 0) params.set('platforms', platforms.join(','));
        const res  = await fetch(`/api/games/search?${params}`);
        const data = await res.json();
        setGameResults(Array.isArray(data) ? data : []);
      } catch {
        setGameResults([]);
      } finally {
        setGamesLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query, platforms]);

  // Fetch user results
  useEffect(() => {
    if (!query.trim()) { setUserResults([]); return; }
    const timer = setTimeout(async () => {
      setUsersLoading(true);
      try {
        const res  = await fetch(`/api/users/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setUserResults(Array.isArray(data) ? data : []);
      } catch {
        setUserResults([]);
      } finally {
        setUsersLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  function handleTabChange(tab) {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab === 'Usuarios' ? 'usuarios' : 'juegos');
    if (query.trim()) params.set('q', query.trim());
    window.history.replaceState(null, '', `/search?${params}`);
  }

  function togglePlatform(p) {
    if (p === null) { setPlatforms([]); return; }
    setPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  }

  function clearAllFilters() {
    setPlatforms([]);
    setActiveRating(DEFAULT_RATING);
    setActiveYear(DEFAULT_YEAR);
  }

  const loading = activeTab === 'Juegos' ? gamesLoading : usersLoading;

  return (
    <div className={`${inter.className} min-h-screen bg-[#0A0A0A] w-full`}>

      <Navbar />

      {/* ── Search Section ── */}
      <div className="flex flex-col gap-4 px-4 lg:px-10 pt-6 lg:pt-8 pb-4 lg:pb-6 bg-[#0A0A0A]">

        {/* Search bar */}
        <div className="flex items-center gap-3 h-14 px-5 rounded-xl bg-[#141414] border border-[#1A1A1A]">
          <IconSearch size={20} color="#71717A" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar juegos, usuarios, géneros..."
            className="flex-1 bg-transparent text-white text-base placeholder:text-[#71717A] outline-none caret-[#A855F7]"
          />
          {loading && (
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          )}
        </div>

        {/* Tabs: Juegos / Usuarios */}
        <div className="flex border-b border-[#1A1A1A]">
          {['Juegos', 'Usuarios'].map((tab) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={[
                  'px-5 py-2.5 text-sm font-medium transition-colors cursor-pointer border-b-2 -mb-px',
                  active
                    ? 'text-white border-[#A855F7]'
                    : 'text-[#71717A] border-transparent hover:text-white',
                ].join(' ')}
              >
                {tab}
                {tab === 'Juegos' && query.trim() && !gamesLoading && (
                  <span className="ml-1.5 text-[11px] font-mono text-[#71717A]">({gameResults.length})</span>
                )}
                {tab === 'Usuarios' && query.trim() && !usersLoading && (
                  <span className="ml-1.5 text-[11px] font-mono text-[#71717A]">({userResults.length})</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Mobile filters button — only on Juegos tab */}
        {activeTab === 'Juegos' && (
          <div className="flex items-center gap-3 lg:hidden">
            <button
              onClick={() => setSheetOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-[#1A1A1A] text-white text-sm font-medium hover:border-[#A855F7] transition-colors cursor-pointer min-h-[44px]"
            >
              <IconFilter size={15} />
              {activeFilterCount > 0 ? `Filtros (${activeFilterCount})` : 'Filtros'}
            </button>
            {activeFilterCount > 0 && (
              <button onClick={clearAllFilters} className="text-[#A855F7] font-mono text-[12px] hover:underline cursor-pointer">
                Limpiar
              </button>
            )}
          </div>
        )}

        {/* Results count — only on Juegos tab */}
        {activeTab === 'Juegos' && query.trim() && !gamesLoading && (
          <p className="text-sm">
            <span className="text-[#A3A3A3]">Se encontraron </span>
            <span className="text-white font-semibold">{gameResults.length} juegos</span>
            <span className="text-[#A3A3A3]"> para </span>
            <span className="text-[#A855F7] font-semibold">&ldquo;{query}&rdquo;</span>
          </p>
        )}

        {/* Genre pills — only on Juegos tab */}
        {activeTab === 'Juegos' && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {GENRE_PILLS.map((g) => (
              <Pill key={g} active={activeGenre === g} onClick={() => setActiveGenre(g)}>{g}</Pill>
            ))}
          </div>
        )}
      </div>

      {/* ── Content area ── */}
      <div className={`flex gap-8 px-4 lg:px-12 py-4 lg:py-6 ${activeTab === 'Usuarios' ? '' : ''}`}>

        {/* Sidebar — desktop only, Juegos tab only */}
        {activeTab === 'Juegos' && (
          <aside className="hidden lg:flex flex-col gap-6 w-[260px] flex-shrink-0">
            <span className={`${anton.className} text-white text-xl`}>Filtros</span>
            <div className="h-px w-full bg-[#1A1A1A]" />

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-white text-sm font-semibold">Plataforma</span>
                {platforms.length > 0 && (
                  <button onClick={() => setPlatforms([])} className="text-[#A855F7] font-mono text-[11px] hover:underline cursor-pointer">
                    Limpiar
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin">
                {PLATFORMS.map((p) => (
                  <PlatformCheckbox key={p} platform={p} checked={platforms.includes(p)} onToggle={togglePlatform} />
                ))}
              </div>
            </div>

            <div className="h-px w-full bg-[#1A1A1A]" />

            <div className="flex flex-col gap-3">
              <span className="text-white text-sm font-semibold">Puntuación mínima</span>
              <div className="flex flex-col gap-2">
                {RATING_OPTIONS.map(({ label, stars }) => (
                  <RatingRadio key={label} label={label} stars={stars} selected={activeRating === label} onSelect={setActiveRating} />
                ))}
              </div>
            </div>

            <div className="h-px w-full bg-[#1A1A1A]" />

            <div className="flex flex-col gap-3">
              <span className="text-white text-sm font-semibold">Año de lanzamiento</span>
              <div className="flex items-center gap-2 flex-wrap">
                {YEAR_OPTIONS.map((y) => (
                  <Pill key={y} active={activeYear === y} mono onClick={() => setActiveYear(y)}>{y}</Pill>
                ))}
              </div>
            </div>
          </aside>
        )}

        {/* Results */}
        <div className="flex flex-col gap-4 flex-1 min-w-0">

          {/* ── Juegos tab ── */}
          {activeTab === 'Juegos' && (
            <>
              {/* Sort + view toggle */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[#71717A] text-[13px]">Ordenar por:</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {SORT_OPTIONS.map((s) => (
                      <Pill key={s} active={activeSort === s} mono onClick={() => setActiveSort(s)}>{s}</Pill>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 border border-[#1A1A1A] rounded-lg p-1 flex-shrink-0">
                  <button
                    onClick={() => setView('list')}
                    className={`p-1.5 rounded-md transition-colors cursor-pointer ${view === 'list' ? 'bg-[#A855F7] text-[#0A0A0A]' : 'text-[#71717A] hover:text-white'}`}
                    title="Vista lista"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
                      <line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" />
                      <line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setView('grid')}
                    className={`p-1.5 rounded-md transition-colors cursor-pointer ${view === 'grid' ? 'bg-[#A855F7] text-[#0A0A0A]' : 'text-[#71717A] hover:text-white'}`}
                    title="Vista cuadrícula"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                    </svg>
                  </button>
                </div>
              </div>

              {!query.trim() && (
                <div className="flex items-center justify-center py-24">
                  <p className="text-[#71717A] text-sm">Escribe algo para buscar juegos</p>
                </div>
              )}
              {query.trim() && gamesLoading && (
                <div className="flex items-center justify-center py-24">
                  <p className="text-[#71717A] text-sm">Buscando...</p>
                </div>
              )}
              {query.trim() && !gamesLoading && gameResults.length === 0 && (
                <div className="flex flex-col items-center gap-4 py-24 text-center">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3F3F46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    <line x1="8" y1="11" x2="14" y2="11" />
                  </svg>
                  <div className="flex flex-col gap-1">
                    <p className="text-white text-sm font-medium">Sin resultados para &ldquo;{query}&rdquo;</p>
                    <p className="text-[#71717A] text-sm">No encontramos juegos para tu búsqueda. Prueba con otro término.</p>
                  </div>
                </div>
              )}
              {!gamesLoading && gameResults.length > 0 && (
                <div className={view === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4' : 'flex flex-col'}>
                  {gameResults.map((game, i) => (
                    view === 'grid'
                      ? <GridCard key={game.id} game={game} />
                      : <GameCard key={game.id} game={game} index={i} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Usuarios tab ── */}
          {activeTab === 'Usuarios' && (
            <>
              {!query.trim() && (
                <div className="flex items-center justify-center py-24">
                  <p className="text-[#71717A] text-sm">Escribe algo para buscar usuarios</p>
                </div>
              )}
              {query.trim() && usersLoading && (
                <div className="flex items-center justify-center py-24">
                  <p className="text-[#71717A] text-sm">Buscando...</p>
                </div>
              )}
              {query.trim() && !usersLoading && userResults.length === 0 && (
                <div className="flex flex-col items-center gap-4 py-24 text-center">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3F3F46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <div className="flex flex-col gap-1">
                    <p className="text-white text-sm font-medium">Sin usuarios para &ldquo;{query}&rdquo;</p>
                    <p className="text-[#71717A] text-sm">No encontramos usuarios con ese nombre o username.</p>
                  </div>
                </div>
              )}
              {!usersLoading && userResults.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {userResults.map((user) => (
                    <UserCard key={user.id} user={user} token={token} />
                  ))}
                </div>
              )}
            </>
          )}

        </div>
      </div>

      {/* Mobile filter bottom sheet — Juegos tab only */}
      {sheetOpen && activeTab === 'Juegos' && (
        <FilterBottomSheet
          platforms={platforms}
          togglePlatform={togglePlatform}
          activeRating={activeRating}
          setActiveRating={setActiveRating}
          activeYear={activeYear}
          setActiveYear={setActiveYear}
          onClose={() => setSheetOpen(false)}
          onClear={clearAllFilters}
        />
      )}

    </div>
  );
}
