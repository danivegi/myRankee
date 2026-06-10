'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Anton, Inter } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';
import Avatar from '@/app/components/Avatar';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
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

const CURRENT_YEAR = new Date().getFullYear();

const GENRE_PILLS = ['RPG', 'Acción', 'Aventura', 'Estrategia', 'Indie', 'Deportes', 'Terror'];

const PLATFORMS = [
  'PlayStation 5', 'PlayStation 4', 'PlayStation 3', 'PlayStation 2', 'PlayStation',
  'PS Vita', 'PSP',
  'Xbox Series X|S', 'Xbox One', 'Xbox 360', 'Xbox',
  'Nintendo Switch', 'Wii U', 'Wii', 'GameCube', 'Nintendo 64', 'SNES', 'NES',
  'Nintendo 3DS', 'Nintendo DS', 'Game Boy Advance', 'Game Boy Color', 'Game Boy',
  'PC',
  'Dreamcast', 'Saturn', 'Mega Drive',
  'Android', 'iOS',
];

const RATING_OPTIONS = [
  { label: '5★', value: '5', stars: 5 },
  { label: '4+', value: '4', stars: 4 },
  { label: '3+', value: '3', stars: 3 },
  { label: '2+', value: '2', stars: 2 },
  { label: '1+', value: '1', stars: 1 },
];

const BACKLOG_OPTIONS = [
  { status: 'jugado',    label: 'Jugado' },
  { status: 'jugando',   label: 'Jugando' },
  { status: 'pendiente', label: 'Pendiente' },
];

const SORT_OPTIONS = ['Relevancia', 'Puntuación', 'Recientes', 'Nombre'];

// ── Platform display helpers ──────────────────────────────────────────────────

// Lower number = shown first. Intentionally ordered most-recent-first within each family.
const PLATFORM_PRIORITY = {
  'PC':               0,
  'PlayStation 5':    10, 'PlayStation 4':    11, 'PlayStation 3': 12,
  'PlayStation 2':    13, 'PlayStation':      14, 'PS Vita':       15, 'PSP': 16,
  'Xbox Series X|S':  20, 'Xbox One':         21, 'Xbox 360':      22, 'Xbox': 23,
  'Nintendo Switch':  30, 'Wii U':            31, 'Wii':           32,
  'GameCube':         33, 'Nintendo 64':      34, 'SNES':          35, 'NES': 36,
  'Nintendo 3DS':     37, 'Nintendo DS':      38,
  'Game Boy Advance': 39, 'Game Boy Color':   40, 'Game Boy':      41,
  'Dreamcast':        50, 'Saturn':           51,
  'Mega Drive':       52, 'Mega Drive/Genesis': 53,
  'Android':          60, 'iOS':              61,
};

const PLATFORM_FAMILY = {
  'PC':               'pc',
  'PlayStation 5':    'ps', 'PlayStation 4':    'ps', 'PlayStation 3': 'ps',
  'PlayStation 2':    'ps', 'PlayStation':      'ps', 'PS Vita':       'ps', 'PSP': 'ps',
  'Xbox Series X|S':  'xbox', 'Xbox One':       'xbox', 'Xbox 360':    'xbox', 'Xbox': 'xbox',
  'Nintendo Switch':  'nintendo', 'Wii U':       'nintendo', 'Wii':         'nintendo',
  'GameCube':         'nintendo', 'Nintendo 64': 'nintendo', 'SNES':        'nintendo', 'NES': 'nintendo',
  'Nintendo 3DS':     'nintendo', 'Nintendo DS': 'nintendo',
  'Game Boy Advance': 'nintendo', 'Game Boy Color': 'nintendo', 'Game Boy':  'nintendo',
  'Dreamcast':        'sega',     'Saturn':      'sega', 'Mega Drive':  'sega', 'Mega Drive/Genesis': 'sega',
  'Android':          'mobile',   'iOS':         'mobile',
};

const PLATFORM_COLOR = {
  'PlayStation 5':    '#0070D1', 'PlayStation 4':    '#0070D1', 'PlayStation 3': '#0070D1',
  'PlayStation 2':    '#0070D1', 'PlayStation':      '#0070D1', 'PS Vita':       '#0070D1', 'PSP': '#0070D1',
  'Xbox Series X|S':  '#107C10', 'Xbox One':         '#107C10', 'Xbox 360':      '#107C10', 'Xbox': '#107C10',
  'Nintendo Switch':  '#E60012', 'Wii U':            '#E60012', 'Wii':           '#E60012',
  'GameCube':         '#E60012', 'Nintendo 64':      '#E60012', 'SNES':          '#E60012', 'NES': '#E60012',
  'Nintendo 3DS':     '#A60010', 'Nintendo DS':      '#A60010',
  'Game Boy Advance': '#A60010', 'Game Boy Color':   '#A60010', 'Game Boy':      '#A60010',
  'PC':               '#6E7B8B',
  'Dreamcast':        '#0089CF', 'Saturn':           '#0089CF',
  'Mega Drive':       '#0089CF', 'Mega Drive/Genesis': '#0089CF',
  'Android':          '#3DDC84', 'iOS':              '#3DDC84',
};

// Returns up to 3 platforms: sorted by priority, one per family (best of each).
function getTopPlatforms(platforms) {
  if (!platforms?.length) return [];
  const sorted = [...platforms].sort(
    (a, b) => (PLATFORM_PRIORITY[a] ?? 99) - (PLATFORM_PRIORITY[b] ?? 99)
  );
  const seenFamilies = new Set();
  const result = [];
  for (const p of sorted) {
    const family = PLATFORM_FAMILY[p] ?? p;
    if (!seenFamilies.has(family)) {
      seenFamilies.add(family);
      result.push(p);
      if (result.length === 3) break;
    }
  }
  return result;
}

// ── Avatar helper ─────────────────────────────────────────────────────────────


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

function RatingOption({ label, value, stars, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(selected ? '' : value)}
      className="flex items-center gap-2.5 cursor-pointer min-h-[36px] w-full text-left"
    >
      <span
        className="flex items-center justify-center w-4 h-4 rounded-full flex-shrink-0"
        style={{ border: `1.5px solid ${selected ? '#A855F7' : '#71717A'}` }}
      >
        {selected && <span className="w-2 h-2 rounded-full bg-[#A855F7]" />}
      </span>
      <div className="flex items-center gap-1">
        <StarRow count={stars} size={14} />
        <span className="font-mono text-[11px] ml-0.5" style={{ color: selected ? '#FFFFFF' : '#71717A' }}>{label}</span>
      </div>
    </button>
  );
}

const YEAR_MIN = 1970;
const YEAR_MAX = CURRENT_YEAR;

function YearRangeSlider({ yearFrom, yearTo, setYearFrom, setYearTo }) {
  const [localValues, setLocalValues] = useState([
    yearFrom ? parseInt(yearFrom, 10) : YEAR_MIN,
    yearTo   ? parseInt(yearTo,   10) : YEAR_MAX,
  ]);
  const debounceRef = useRef(null);

  // Sync inward when parent resets (e.g. Limpiar button)
  useEffect(() => {
    setLocalValues([
      yearFrom ? parseInt(yearFrom, 10) : YEAR_MIN,
      yearTo   ? parseInt(yearTo,   10) : YEAR_MAX,
    ]);
  }, [yearFrom, yearTo]);

  function handleChange(values) {
    setLocalValues(values);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const isFullRange = values[0] === YEAR_MIN && values[1] === YEAR_MAX;
      setYearFrom(isFullRange ? '' : String(values[0]));
      setYearTo(  isFullRange ? '' : String(values[1]));
    }, 300);
  }

  const isFullRange = localValues[0] === YEAR_MIN && localValues[1] === YEAR_MAX;

  return (
    <div className="flex flex-col gap-4 px-1">
      <Slider
        range
        min={YEAR_MIN}
        max={YEAR_MAX}
        value={localValues}
        onChange={handleChange}
        styles={{
          track: { backgroundColor: '#A855F7', height: 4 },
          rail:  { backgroundColor: '#2A2A2A', height: 4 },
          handle: { width: 16, height: 16, marginTop: -6, backgroundColor: '#A855F7', border: '2px solid #FFFFFF', boxShadow: 'none', opacity: 1 },
        }}
      />
      <div className="flex items-center justify-between">
        <span className="font-mono text-[12px] px-2 py-0.5 rounded bg-[#1A1A1A] border border-[#2A2A2A]" style={{ color: isFullRange ? '#52525B' : '#FFFFFF' }}>
          {localValues[0]}
        </span>
        <span className="text-[#52525B] text-xs">—</span>
        <span className="font-mono text-[12px] px-2 py-0.5 rounded bg-[#1A1A1A] border border-[#2A2A2A]" style={{ color: isFullRange ? '#52525B' : '#FFFFFF' }}>
          {localValues[1]}
        </span>
      </div>
    </div>
  );
}

function AccordionSection({ title, children, badge = 0 }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full py-1 cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-semibold">{title}</span>
          {badge > 0 && (
            <span className="text-[10px] font-mono bg-[#A855F7] text-[#0A0A0A] rounded-full px-1.5 py-0.5 leading-none">{badge}</span>
          )}
        </div>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="#71717A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
          className="flex-shrink-0"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

function CompanySearch({ selectedCompanies, onAdd, onRemove }) {
  const [q, setQ]               = useState('');
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [open, setOpen]         = useState(false);
  const wrapperRef              = useRef(null);

  useEffect(() => {
    if (!q.trim() || q.trim().length < 2) { setResults([]); setOpen(false); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res  = await fetch(`/api/companies/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    function handler(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function select(company) {
    if (!selectedCompanies.find((c) => c.id === company.id)) onAdd(company);
    setQ('');
    setResults([]);
    setOpen(false);
  }

  const unselected = results.filter((r) => !selectedCompanies.find((c) => c.id === r.id));

  return (
    <div ref={wrapperRef} className="flex flex-col gap-2">
      <div className="relative">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => unselected.length > 0 && setOpen(true)}
          placeholder="Buscar compañía..."
          className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-[13px] placeholder:text-[#52525B] outline-none focus:border-[#A855F7] transition-colors"
        />
        {loading && (
          <svg className="absolute right-2.5 top-2.5 animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        )}
        {open && unselected.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg mt-1 z-20 max-h-44 overflow-y-auto shadow-xl">
            {unselected.map((c) => (
              <button
                key={c.id}
                onClick={() => select(c)}
                className="w-full flex items-center justify-between gap-3 px-3 py-2 text-[13px] text-white hover:bg-[#2A2A2A] cursor-pointer transition-colors"
              >
                <span className="truncate">{c.name}</span>
                {c.gamesCount > 0 && (
                  <span className="text-[#71717A] text-[11px] font-mono flex-shrink-0">
                    {c.gamesCount === 1 ? '1 juego' : `${c.gamesCount} juegos`}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      {selectedCompanies.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedCompanies.map((c) => (
            <span
              key={c.id}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono"
              style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.4)', color: '#A855F7' }}
            >
              {c.name}
              <button onClick={() => onRemove(c.id)} className="cursor-pointer opacity-70 hover:opacity-100 flex-shrink-0">
                <IconX size={9} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function GameCard({ game, index }) {
  const topPlatforms = getTopPlatforms(game.platforms);
  const extraCount   = game.platforms.length - 3;

  return (
    <Link
      href={`/game/${game.id}`}
      className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-[#111111] transition-colors group cursor-pointer"
    >
      <span className="text-[#71717A] font-mono text-[13px] w-14 text-right flex-shrink-0">{index + 1}</span>
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
      {topPlatforms.length > 0 && (
        <div className="hidden sm:flex flex-col items-end gap-0.5 flex-shrink-0">
          {topPlatforms.map((p) => (
            <span
              key={p}
              className="font-mono text-[11px] leading-tight whitespace-nowrap"
              style={{ color: PLATFORM_COLOR[p] ?? '#71717A' }}
            >
              {p}
            </span>
          ))}
          {extraCount > 0 && (
            <span className="font-mono text-[10px] text-[#52525B] leading-tight">+{extraCount}</span>
          )}
        </div>
      )}
    </Link>
  );
}

function buildPageRange(current, total) {
  const delta = 2;
  const rangeSet = new Set([1, total]);
  for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) rangeSet.add(i);
  const sorted = [...rangeSet].sort((a, b) => a - b);
  const result = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) result.push('…');
    result.push(p);
    prev = p;
  }
  return result;
}

function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  const pages = buildPageRange(page, totalPages);
  const btnBase = 'min-w-[36px] h-9 rounded-lg border text-sm font-mono transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed';
  return (
    <div className="flex items-center justify-center gap-1 pt-8 pb-4 flex-wrap">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className={`${btnBase} border-[#1A1A1A] text-[#71717A] hover:text-white hover:border-[#3F3F46] px-3`}
      >
        ← Ant.
      </button>
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`dots-${i}`} className="text-[#3F3F46] text-sm px-1 select-none">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={[
              btnBase,
              p === page
                ? 'bg-[#A855F7] text-[#0A0A0A] border-[#A855F7]'
                : 'border-[#1A1A1A] text-[#71717A] hover:text-white hover:border-[#3F3F46]',
            ].join(' ')}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className={`${btnBase} border-[#1A1A1A] text-[#71717A] hover:text-white hover:border-[#3F3F46] px-3`}
      >
        Sig. →
      </button>
    </div>
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
        <Avatar user={user} size={64} />
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

function FilterBottomSheet({
  platforms, togglePlatform,
  activeRating, setActiveRating,
  yearFrom, setYearFrom, yearTo, setYearTo,
  backlogFilter, toggleBacklog, isLoggedIn,
  selectedCompanies, onAddCompany, onRemoveCompany, filterResetKey,
  onClose, onClear,
}) {
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
          maxHeight: '90vh',
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

          {/* Platform */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-white text-sm font-semibold">Plataforma</span>
              {platforms.length > 0 && (
                <button onClick={() => togglePlatform(null)} className="text-[#A855F7] font-mono text-[11px] hover:underline cursor-pointer">
                  Limpiar
                </button>
              )}
            </div>
            <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto pr-1">
              {PLATFORMS.map((p) => (
                <PlatformCheckbox key={p} platform={p} checked={platforms.includes(p)} onToggle={togglePlatform} />
              ))}
            </div>
          </div>

          <div className="h-px bg-[#1A1A1A]" />

          {/* Rating */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-white text-sm font-semibold">Puntuación mínima</span>
              {activeRating && (
                <button onClick={() => setActiveRating('')} className="text-[#A855F7] font-mono text-[11px] hover:underline cursor-pointer">
                  Limpiar
                </button>
              )}
            </div>
            <div className="flex flex-col gap-1">
              {RATING_OPTIONS.map(({ label, value, stars }) => (
                <RatingOption key={value} label={label} value={value} stars={stars} selected={activeRating === value} onSelect={setActiveRating} />
              ))}
            </div>
          </div>

          <div className="h-px bg-[#1A1A1A]" />

          {/* Year range */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-white text-sm font-semibold">Año de lanzamiento</span>
              {(yearFrom || yearTo) && (
                <button onClick={() => { setYearFrom(''); setYearTo(''); }} className="text-[#A855F7] font-mono text-[11px] hover:underline cursor-pointer">
                  Limpiar
                </button>
              )}
            </div>
            <YearRangeSlider yearFrom={yearFrom} yearTo={yearTo} setYearFrom={setYearFrom} setYearTo={setYearTo} />
          </div>

          <div className="h-px bg-[#1A1A1A]" />

          {/* Backlog (accordion) */}
          <AccordionSection title="Estado en backlog" badge={backlogFilter.length}>
            {!isLoggedIn ? (
              <p className="text-[#52525B] text-xs leading-relaxed">Inicia sesión para filtrar por tu backlog</p>
            ) : (
              <div className="flex flex-col gap-1">
                {BACKLOG_OPTIONS.map(({ status, label }) => (
                  <PlatformCheckbox
                    key={status}
                    platform={label}
                    checked={backlogFilter.includes(status)}
                    onToggle={() => toggleBacklog(status)}
                  />
                ))}
              </div>
            )}
          </AccordionSection>

          <div className="h-px bg-[#1A1A1A]" />

          {/* Company (accordion) */}
          <AccordionSection title="Desarrollador / Publisher" badge={selectedCompanies.length}>
            <CompanySearch
              key={filterResetKey}
              selectedCompanies={selectedCompanies}
              onAdd={onAddCompany}
              onRemove={onRemoveCompany}
            />
          </AccordionSection>

        </div>

        <div className="flex gap-3 px-5 pt-4 border-t border-[#1A1A1A] flex-shrink-0" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
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
  const [query,            setQuery]            = useState('');
  const [activeTab,        setActiveTab]        = useState('Juegos');
  const [gameResults,      setGameResults]      = useState([]);
  const [userResults,      setUserResults]      = useState([]);
  const [gamesLoading,     setGamesLoading]     = useState(false);
  const [usersLoading,     setUsersLoading]     = useState(false);
  const [activeGenres,     setActiveGenres]     = useState([]);
  const [platforms,        setPlatforms]        = useState([]);
  const [activeRating,     setActiveRating]     = useState('');
  const [yearFrom,         setYearFrom]         = useState('');
  const [yearTo,           setYearTo]           = useState('');
  const [backlogFilter,    setBacklogFilter]    = useState([]);
  const [selectedCompanies, setSelectedCompanies] = useState([]);
  const [activeSort,       setActiveSort]       = useState('Relevancia');
  const [view,             setView]             = useState('list');
  const [sheetOpen,        setSheetOpen]        = useState(false);
  const [token,            setToken]            = useState(null);
  const [initialized,      setInitialized]      = useState(false);
  const [filterResetKey,   setFilterResetKey]   = useState(0);
  const [searchError,      setSearchError]      = useState(null); // e.g. 'auth_required'
  const [page,             setPage]             = useState(1);
  const [totalCount,       setTotalCount]       = useState(null);
  const resultsTopRef = useRef(null);

  const activeFilterCount =
    platforms.length +
    activeGenres.length +
    (activeRating ? 1 : 0) +
    (yearFrom ? 1 : 0) +
    (yearTo ? 1 : 0) +
    backlogFilter.length +
    selectedCompanies.length;

  // Read all filter state from URL on mount
  useEffect(() => {
    const tok = localStorage.getItem('token');
    setToken(tok);

    const params = new URLSearchParams(window.location.search);

    const q = params.get('q');
    if (q) setQuery(q);

    if (params.get('tab') === 'usuarios') setActiveTab('Usuarios');

    const genres = params.get('genres');
    if (genres) setActiveGenres(genres.split(',').filter((g) => GENRE_PILLS.includes(g)));

    const plats = params.get('platforms');
    if (plats) setPlatforms(plats.split(',').filter((p) => PLATFORMS.includes(p)));

    const rating = params.get('rating');
    if (rating && ['1', '2', '3', '4', '5'].includes(rating)) setActiveRating(rating);

    const yf = params.get('year_from');
    if (yf) setYearFrom(yf);
    const yt = params.get('year_to');
    if (yt) setYearTo(yt);

    const backlog = params.get('backlog');
    if (backlog) setBacklogFilter(backlog.split(',').filter((s) => BACKLOG_OPTIONS.some((o) => o.status === s)));

    const companies = params.get('companies');
    if (companies) {
      const parsed = companies.split(',').map((s) => {
        const idx = s.indexOf('~');
        if (idx === -1) return null;
        return { id: Number(s.slice(0, idx)), name: s.slice(idx + 1) };
      }).filter((c) => c && !isNaN(c.id) && c.name);
      if (parsed.length > 0) setSelectedCompanies(parsed);
    }

    const p = parseInt(params.get('page') ?? '1', 10);
    if (!isNaN(p) && p > 1) setPage(p);

    setInitialized(true);
  }, []);

  // Write all filter state to URL whenever anything changes (after init)
  useEffect(() => {
    if (!initialized) return;
    const params = new URLSearchParams();
    if (query.trim())            params.set('q', query.trim());
    if (activeTab === 'Usuarios') params.set('tab', 'usuarios');
    if (activeGenres.length > 0)  params.set('genres', activeGenres.join(','));
    if (platforms.length > 0)    params.set('platforms', platforms.join(','));
    if (activeRating)            params.set('rating', activeRating);
    if (yearFrom)                params.set('year_from', yearFrom);
    if (yearTo)                  params.set('year_to', yearTo);
    if (backlogFilter.length > 0) params.set('backlog', backlogFilter.join(','));
    if (selectedCompanies.length > 0)
      params.set('companies', selectedCompanies.map((c) => `${c.id}~${c.name}`).join(','));
    if (page > 1) params.set('page', String(page));
    const str = params.toString();
    window.history.replaceState(null, '', str ? `/search?${str}` : '/search');
  }, [initialized, query, activeTab, activeGenres, platforms, activeRating, yearFrom, yearTo, backlogFilter, selectedCompanies, page]);

  // Reset to page 1 whenever any filter (not page itself) changes
  useEffect(() => {
    if (!initialized) return;
    setPage(1);
  }, [initialized, query, platforms, activeGenres, activeRating, yearFrom, yearTo, backlogFilter, selectedCompanies, activeSort]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch game results
  useEffect(() => {
    const hasText    = query.trim().length > 0;
    const hasFilters = platforms.length > 0 || activeGenres.length > 0 ||
      !!activeRating || !!yearFrom || !!yearTo ||
      backlogFilter.length > 0 || selectedCompanies.length > 0;

    if (!hasText && !hasFilters) { setGameResults([]); setSearchError(null); return; }

    const timer = setTimeout(async () => {
      setGamesLoading(true);
      setSearchError(null);
      try {
        const params = new URLSearchParams();
        if (query.trim())                 params.set('q', query.trim());
        if (platforms.length > 0)         params.set('platforms', platforms.join(','));
        if (activeGenres.length > 0)      params.set('genres', activeGenres.join(','));
        if (activeRating)                 params.set('min_rating', activeRating);
        if (yearFrom)                     params.set('year_from', yearFrom);
        if (yearTo)                       params.set('year_to', yearTo);
        if (backlogFilter.length > 0)     params.set('backlog_status', backlogFilter.join(','));
        if (selectedCompanies.length > 0) params.set('company_ids', selectedCompanies.map((c) => c.id).join(','));
        params.set('sort_by', activeSort.toLowerCase());

        const headers = {};
        if (backlogFilter.length > 0 && token) headers.Authorization = `Bearer ${token}`;

        params.set('page', String(page));
        const res  = await fetch(`/api/games/search?${params}`, { headers });
        const data = await res.json();

        if (!res.ok) {
          setSearchError(data?.error ?? 'error');
          setGameResults([]);
          setTotalCount(null);
        } else {
          setGameResults(data.games ?? []);
          setTotalCount(data.total ?? null);
        }
      } catch {
        setGameResults([]);
      } finally {
        setGamesLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query, platforms, activeGenres, activeRating, yearFrom, yearTo, backlogFilter, selectedCompanies, token, page, activeSort]);

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

  // Client-side sort derived from gameResults
  const sortedGameResults = useMemo(() => {
    if (!gameResults.length) return gameResults;
    switch (activeSort) {
      case 'Nombre':    return [...gameResults].sort((a, b) => a.name.localeCompare(b.name, 'es'));
      case 'Recientes': return [...gameResults].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
      default:          return gameResults;
    }
  }, [gameResults, activeSort]);

  function handleTabChange(tab) {
    setActiveTab(tab);
  }

  function handlePageChange(newPage) {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function togglePlatform(p) {
    if (p === null) { setPlatforms([]); return; }
    setPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  }

  function toggleGenre(g) {
    setActiveGenres((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]);
  }

  function toggleBacklog(s) {
    setBacklogFilter((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  function clearAllFilters() {
    setPlatforms([]);
    setActiveGenres([]);
    setActiveRating('');
    setYearFrom('');
    setYearTo('');
    setBacklogFilter([]);
    setSelectedCompanies([]);
    setFilterResetKey((k) => k + 1);
    setSearchError(null);
    setPage(1);
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

        {/* Tabs */}
        <div className="flex border-b border-[#1A1A1A]">
          {['Juegos', 'Usuarios'].map((tab) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={[
                  'px-5 py-2.5 text-sm font-medium transition-colors cursor-pointer border-b-2 -mb-px',
                  active ? 'text-white border-[#A855F7]' : 'text-[#71717A] border-transparent hover:text-white',
                ].join(' ')}
              >
                {tab}
                {tab === 'Juegos' && (query.trim() || activeFilterCount > 0) && !gamesLoading && (
                  <span className="ml-1.5 text-[11px] font-mono text-[#71717A]">
                    ({totalCount != null ? totalCount : gameResults.length}{totalCount == null && gameResults.length === 25 ? '+' : ''})
                  </span>
                )}
                {tab === 'Usuarios' && query.trim() && !usersLoading && (
                  <span className="ml-1.5 text-[11px] font-mono text-[#71717A]">({userResults.length})</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Mobile filter button + clear — Juegos tab only */}
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

        {/* Results count */}
        {activeTab === 'Juegos' && (query.trim() || activeFilterCount > 0) && !gamesLoading && gameResults.length > 0 && (
          <p className="text-sm">
            <span className="text-[#A3A3A3]">Se encontraron </span>
            <span className="text-white font-semibold">
              {totalCount != null ? totalCount : gameResults.length}{totalCount == null && gameResults.length === 25 ? '+' : ''} juegos
            </span>
            {query.trim() ? (
              <>
                <span className="text-[#A3A3A3]"> para </span>
                <span className="text-[#A855F7] font-semibold">&ldquo;{query}&rdquo;</span>
                {activeFilterCount > 0 && <span className="text-[#A3A3A3]"> con tus filtros</span>}
              </>
            ) : (
              <span className="text-[#A3A3A3]"> con tus filtros</span>
            )}
          </p>
        )}

        {/* Genre pills — multi-select, Juegos tab only */}
        {activeTab === 'Juegos' && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <Pill active={activeGenres.length === 0} onClick={() => setActiveGenres([])}>
              Todos
            </Pill>
            {GENRE_PILLS.map((g) => (
              <Pill key={g} active={activeGenres.includes(g)} onClick={() => toggleGenre(g)}>
                {g}
              </Pill>
            ))}
          </div>
        )}
      </div>

      {/* ── Content area ── */}
      <div className="flex gap-8 px-4 lg:px-12 py-4 lg:py-6">

        {/* Desktop sidebar — Juegos tab only */}
        {activeTab === 'Juegos' && (
          <aside className="hidden lg:flex flex-col gap-5 w-[260px] flex-shrink-0">

            <div className="flex items-center justify-between">
              <span className={`${anton.className} text-white text-xl`}>Filtros</span>
              {activeFilterCount > 0 && (
                <button onClick={clearAllFilters} className="text-[#A855F7] font-mono text-[11px] hover:underline cursor-pointer">
                  Limpiar ({activeFilterCount})
                </button>
              )}
            </div>

            <div className="h-px w-full bg-[#1A1A1A]" />

            {/* Platform */}
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

            {/* Rating */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-white text-sm font-semibold">Puntuación mínima</span>
                {activeRating && (
                  <button onClick={() => setActiveRating('')} className="text-[#A855F7] font-mono text-[11px] hover:underline cursor-pointer">
                    Limpiar
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-1">
                {RATING_OPTIONS.map(({ label, value, stars }) => (
                  <RatingOption
                    key={value}
                    label={label}
                    value={value}
                    stars={stars}
                    selected={activeRating === value}
                    onSelect={setActiveRating}
                  />
                ))}
              </div>
            </div>

            <div className="h-px w-full bg-[#1A1A1A]" />

            {/* Year range */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-white text-sm font-semibold">Año de lanzamiento</span>
                {(yearFrom || yearTo) && (
                  <button onClick={() => { setYearFrom(''); setYearTo(''); }} className="text-[#A855F7] font-mono text-[11px] hover:underline cursor-pointer">
                    Limpiar
                  </button>
                )}
              </div>
              <YearRangeSlider yearFrom={yearFrom} yearTo={yearTo} setYearFrom={setYearFrom} setYearTo={setYearTo} />
            </div>

            <div className="h-px w-full bg-[#1A1A1A]" />

            {/* Backlog (collapsible) */}
            <AccordionSection title="Estado en backlog" badge={backlogFilter.length}>
              {!token ? (
                <p className="text-[#52525B] text-xs leading-relaxed">Inicia sesión para filtrar por tu backlog</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {BACKLOG_OPTIONS.map(({ status, label }) => (
                    <PlatformCheckbox
                      key={status}
                      platform={label}
                      checked={backlogFilter.includes(status)}
                      onToggle={() => toggleBacklog(status)}
                    />
                  ))}
                </div>
              )}
            </AccordionSection>

            <div className="h-px w-full bg-[#1A1A1A]" />

            {/* Company (collapsible) */}
            <AccordionSection title="Desarrollador / Publisher" badge={selectedCompanies.length}>
              <CompanySearch
                key={filterResetKey}
                selectedCompanies={selectedCompanies}
                onAdd={(c) => setSelectedCompanies((prev) => [...prev, c])}
                onRemove={(id) => setSelectedCompanies((prev) => prev.filter((c) => c.id !== id))}
              />
            </AccordionSection>

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

              {/* Default discovery state — no text, no filters */}
              {!query.trim() && activeFilterCount === 0 && (
                <div className="flex flex-col items-center gap-4 py-24 text-center">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3F3F46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <div className="flex flex-col gap-1.5">
                    <p className="text-white text-sm font-medium">Descubre juegos</p>
                    <p className="text-[#71717A] text-sm">Usa el buscador o aplica filtros para encontrar juegos</p>
                    <p className="text-[#3F3F46] text-xs font-mono mt-0.5">Prueba: &ldquo;Elden Ring&rdquo; · filtra por RPG · o explora por año</p>
                  </div>
                </div>
              )}

              {/* Loading */}
              {gamesLoading && (
                <div className="flex items-center justify-center py-24">
                  <p className="text-[#71717A] text-sm">Buscando...</p>
                </div>
              )}

              {/* Auth error (e.g. backlog filter without login) */}
              {!gamesLoading && searchError === 'auth_required' && (
                <div className="flex flex-col items-center gap-3 py-24 text-center">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#3F3F46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <div className="flex flex-col gap-1">
                    <p className="text-white text-sm font-medium">Inicia sesión para usar este filtro</p>
                    <p className="text-[#71717A] text-sm">El filtro de backlog requiere tener una cuenta.</p>
                    <Link href="/login" className="text-[#A855F7] text-sm hover:underline mt-1">Iniciar sesión →</Link>
                  </div>
                </div>
              )}

              {/* No results */}
              {!gamesLoading && !searchError && (query.trim() || activeFilterCount > 0) && sortedGameResults.length === 0 && (
                <div className="flex flex-col items-center gap-4 py-24 text-center">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3F3F46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    <line x1="8" y1="11" x2="14" y2="11" />
                  </svg>
                  <div className="flex flex-col gap-1">
                    {query.trim()
                      ? <p className="text-white text-sm font-medium">Sin resultados para &ldquo;{query}&rdquo;</p>
                      : <p className="text-white text-sm font-medium">Sin resultados con estos filtros</p>
                    }
                    <p className="text-[#71717A] text-sm">
                      {activeFilterCount > 0
                        ? 'Prueba ajustando los filtros o busca con otro término.'
                        : 'No encontramos juegos para tu búsqueda. Prueba con otro término.'}
                    </p>
                    {activeFilterCount > 0 && (
                      <button onClick={clearAllFilters} className="text-[#A855F7] text-sm hover:underline cursor-pointer mt-1">
                        Limpiar filtros ({activeFilterCount})
                      </button>
                    )}
                  </div>
                </div>
              )}
              {!gamesLoading && sortedGameResults.length > 0 && (
                <>
                  <div className={view === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4' : 'flex flex-col'}>
                    {sortedGameResults.map((game, i) => (
                      view === 'grid'
                        ? <GridCard key={game.id} game={game} />
                        : <GameCard key={game.id} game={game} index={(page - 1) * 25 + i} />
                    ))}
                  </div>

                  {/* Numbered pagination (filter searches with known total) */}
                  {totalCount != null && (
                    <Pagination
                      page={page}
                      totalPages={Math.ceil(totalCount / 25)}
                      onPageChange={handlePageChange}
                    />
                  )}

                  {/* Simplified prev/next (text searches, total unknown) */}
                  {totalCount == null && (page > 1 || sortedGameResults.length === 25) && (
                    <div className="flex items-center justify-center gap-3 pt-8 pb-4">
                      <button
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page <= 1}
                        className="px-4 py-2 rounded-lg border border-[#1A1A1A] text-[#71717A] text-sm hover:text-white hover:border-[#3F3F46] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        ← Anterior
                      </button>
                      <span className="text-[#71717A] text-sm font-mono">Página {page}</span>
                      <button
                        onClick={() => handlePageChange(page + 1)}
                        disabled={sortedGameResults.length < 25}
                        className="px-4 py-2 rounded-lg border border-[#1A1A1A] text-[#71717A] text-sm hover:text-white hover:border-[#3F3F46] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Siguiente →
                      </button>
                    </div>
                  )}
                </>
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
          yearFrom={yearFrom}
          setYearFrom={setYearFrom}
          yearTo={yearTo}
          setYearTo={setYearTo}
          backlogFilter={backlogFilter}
          toggleBacklog={toggleBacklog}
          isLoggedIn={!!token}
          selectedCompanies={selectedCompanies}
          onAddCompany={(c) => setSelectedCompanies((prev) => [...prev, c])}
          onRemoveCompany={(id) => setSelectedCompanies((prev) => prev.filter((c) => c.id !== id))}
          filterResetKey={filterResetKey}
          onClose={() => setSheetOpen(false)}
          onClear={clearAllFilters}
        />
      )}

    </div>
  );
}
