'use client';

import { useState, useEffect, useRef, useMemo, use } from 'react';
import { Anton, Inter } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import Avatar from '@/app/components/Avatar';
import ReviewCommentsSection from '@/app/components/ReviewCommentsSection';
import ShareModal from '@/app/components/ShareModal';
import ReportModal from '@/app/components/ReportModal';
import { getAchievementImage } from '@/lib/achievement-images';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  AreaChart, Area,
} from 'recharts';

const anton = Anton({ weight: '400', subsets: ['latin'], display: 'swap' });
const inter = Inter({ subsets: ['latin'], display: 'swap' });

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconStar({ size = 14, color = '#A855F7', fill = '#A855F7' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function IconStarHalf({ size = 14, color = '#A855F7' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 17.8 5.8 21 7 14.1 2 9.3l7-.8L12 2" fill="#A855F7" />
      <path d="M12 2v15.8" />
    </svg>
  );
}

function IconX({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconHeart({ size = 14, color = 'currentColor', filled = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function IconMessage({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

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

function StarRating({ value, size = 14 }) {
  if (!value) return null;
  const full  = Math.floor(value);
  const half  = value % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: full  }).map((_, i) => <IconStar     key={`f${i}`} size={size} />)}
      {half &&                                       <IconStarHalf              size={size} />}
      {Array.from({ length: empty }).map((_, i) => <IconStar     key={`e${i}`} size={size} color="#3F3F46" fill="#3F3F46" />)}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

const TABS = ['Reseñas', 'Juegos', 'Listas', 'Backlog', 'Favoritos', 'Estadísticas', 'Logros', 'Diario'];

// ── Backlog tab ───────────────────────────────────────────────────────────────

const BACKLOG_STATUS_TABS = [
  { key: 'pendiente', label: 'Pendiente', color: '#A855F7' },
  { key: 'jugando',   label: 'Jugando',   color: '#3B82F6' },
  { key: 'jugado',    label: 'Jugado',    color: '#10B981' },
];

const SORT_OPTIONS = [
  { key: 'recent', label: 'Recientes' },
  { key: 'old',    label: 'Antiguos'  },
  { key: 'az',     label: 'A-Z'       },
  { key: 'za',     label: 'Z-A'       },
  { key: 'year',   label: 'Año del juego' },
];

const STATUS_COLORS = { pendiente: '#A855F7', jugando: '#3B82F6', jugado: '#10B981' };

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function IconGrid({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>
  );
}

function IconList({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  );
}

function IconTrash({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}

function BacklogGridCard({ item, isOwner, onStatusChange, onRemove }) {
  const [hovering,  setHovering]  = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [changing,  setChanging]  = useState(false);

  async function doStatusChange(newStatus) {
    setChanging(true);
    await onStatusChange(item.igdb_game_id, newStatus);
    setChanging(false);
    setHovering(false);
  }

  function handleMouseLeave() {
    setHovering(false);
    setConfirming(false);
  }

  const otherStatuses = BACKLOG_STATUS_TABS.filter((s) => s.key !== item.status);

  return (
    <div className="flex flex-col gap-2">
      <div
        className="relative rounded-lg overflow-hidden bg-[#141414] cursor-pointer"
        style={{ aspectRatio: '3/4' }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={handleMouseLeave}
      >
        <Link href={`/game/${item.igdb_game_id}`} className="absolute inset-0 block">
          {item.game.cover ? (
            <Image src={item.game.cover} alt={item.game.name ?? ''} fill sizes="(max-width: 768px) 33vw, 200px" className="object-cover" />
          ) : (
            <div className="w-full h-full bg-[#1A1A1A] flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3F3F46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="6" width="20" height="12" rx="2"/>
                <path d="M9.5 9.5v5M7 12h5M17 12h.01"/>
              </svg>
            </div>
          )}
        </Link>

        {/* Owner overlay */}
        {isOwner && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 z-10 transition-opacity duration-150"
            style={{
              backgroundColor: 'rgba(0,0,0,0.82)',
              opacity: hovering ? 1 : 0,
              pointerEvents: hovering ? 'auto' : 'none',
            }}
          >
            {changing ? (
              <div className="w-5 h-5 rounded-full border-2 border-[#A855F7] border-t-transparent animate-spin" />
            ) : confirming ? (
              <div className="flex flex-col gap-2 w-full">
                <p className="text-white text-[11px] text-center font-mono">¿Quitar del backlog?</p>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setConfirming(false)}
                    className="flex-1 py-1.5 rounded text-[11px] text-[#71717A] border border-[#3F3F46] hover:text-white transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => onRemove(item.igdb_game_id)}
                    className="flex-1 py-1.5 rounded text-[11px] text-red-400 border border-red-500/50 hover:bg-red-500/10 transition-colors cursor-pointer"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-1.5 w-full">
                  {otherStatuses.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => doStatusChange(s.key)}
                      className="w-full py-1.5 rounded text-[11px] font-mono text-white transition-colors cursor-pointer hover:brightness-110"
                      style={{ backgroundColor: `${s.color}28`, border: `1px solid ${s.color}55` }}
                    >
                      → {s.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setConfirming(true)}
                  className="flex items-center gap-1 text-[#71717A] hover:text-red-400 text-[11px] transition-colors cursor-pointer mt-1"
                >
                  <IconTrash size={12} />
                  Quitar
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <Link href={`/game/${item.igdb_game_id}`} className="flex flex-col gap-0.5">
        <span className={`${inter.className} text-white text-[12px] font-semibold leading-snug line-clamp-2 hover:text-[#A855F7] transition-colors`}>
          {item.game.name ?? `#${item.igdb_game_id}`}
        </span>
        {item.game.year && (
          <span className="text-[#71717A] text-[11px] font-mono">{item.game.year}</span>
        )}
      </Link>
    </div>
  );
}

function BacklogListRow({ item, isOwner, onStatusChange, onRemove }) {
  const [confirming, setConfirming] = useState(false);
  const [changing,   setChanging]   = useState(false);

  async function doStatusChange(e) {
    const newStatus = e.target.value;
    if (newStatus === item.status) return;
    setChanging(true);
    await onStatusChange(item.igdb_game_id, newStatus);
    setChanging(false);
  }

  const color = STATUS_COLORS[item.status] ?? '#A855F7';

  return (
    <div className="flex items-center gap-4 py-3.5 border-b border-[#1A1A1A] group">
      <Link href={`/game/${item.igdb_game_id}`} className="flex-shrink-0">
        <div className="relative w-12 h-16 rounded overflow-hidden bg-[#141414]">
          {item.game.cover ? (
            <Image src={item.game.cover} alt={item.game.name ?? ''} fill sizes="48px" className="object-cover" />
          ) : (
            <div className="w-full h-full bg-[#1A1A1A]" />
          )}
        </div>
      </Link>

      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <Link href={`/game/${item.igdb_game_id}`} className="text-white text-sm font-semibold hover:text-[#A855F7] transition-colors line-clamp-1">
          {item.game.name ?? `#${item.igdb_game_id}`}
        </Link>
        <span className="text-[#71717A] text-[11px] font-mono">{item.game.year ?? '—'}</span>
      </div>

      <span
        className="text-[10px] font-mono px-2 py-0.5 rounded-full flex-shrink-0"
        style={{ color, backgroundColor: `${color}18`, border: `1px solid ${color}40` }}
      >
        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
      </span>

      <span className="text-[#3F3F46] text-[11px] font-mono flex-shrink-0 hidden sm:block">
        {new Date(item.added_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
      </span>

      {isOwner && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {changing ? (
            <div className="w-4 h-4 rounded-full border-2 border-[#A855F7] border-t-transparent animate-spin" />
          ) : (
            <select
              value={item.status}
              onChange={doStatusChange}
              className="bg-[#111111] border border-[#1A1A1A] text-[#71717A] text-[11px] rounded px-2 py-1 cursor-pointer focus:outline-none focus:border-[#A855F7] hover:border-[#3F3F46] transition-colors"
            >
              {BACKLOG_STATUS_TABS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          )}

          {confirming ? (
            <div className="flex items-center gap-1">
              <button onClick={() => setConfirming(false)} className="text-[#71717A] text-[11px] hover:text-white cursor-pointer transition-colors">
                Cancelar
              </button>
              <button onClick={() => { onRemove(item.igdb_game_id); setConfirming(false); }} className="text-red-400 text-[11px] hover:text-red-300 cursor-pointer transition-colors">
                Eliminar
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirming(true)} className="text-[#3F3F46] hover:text-red-400 transition-colors cursor-pointer" title="Quitar del backlog">
              <IconTrash size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function BacklogTab({ username, isOwner, token }) {
  const [items,        setItems]        = useState([]);
  const [activeStatus, setActiveStatus] = useState('pendiente');
  const [sort,         setSort]         = useState('recent');
  const [viewMode,     setViewMode]     = useState('grid');
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(false);

  // Derive counts from items — single source of truth, never out of sync
  const counts = {
    pendiente: items.filter((i) => i.status === 'pendiente').length,
    jugando:   items.filter((i) => i.status === 'jugando').length,
    jugado:    items.filter((i) => i.status === 'jugado').length,
  };

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`/api/users/${username}/backlog`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setItems(data.items))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [username]);

  const filtered = items.filter((item) => item.status === activeStatus);

  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case 'recent': return new Date(b.added_at) - new Date(a.added_at);
      case 'old':    return new Date(a.added_at) - new Date(b.added_at);
      case 'az':     return (a.game.name ?? '').localeCompare(b.game.name ?? '', 'es');
      case 'za':     return (b.game.name ?? '').localeCompare(a.game.name ?? '', 'es');
      case 'year':   return (b.game.year ?? 0) - (a.game.year ?? 0);
      default:       return 0;
    }
  });

  async function handleStatusChange(igdbId, newStatus) {
    const t = token ?? localStorage.getItem('token');
    if (!t) return;
    const res = await fetch('/api/backlog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ igdb_game_id: igdbId, status: newStatus }),
    });
    if (!res.ok) return;
    setItems((prev) => prev.map((i) => i.igdb_game_id === igdbId ? { ...i, status: newStatus } : i));
  }

  async function handleRemove(igdbId) {
    const t = token ?? localStorage.getItem('token');
    if (!t) return;
    await fetch('/api/backlog', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ igdb_game_id: igdbId }),
    });
    setItems((prev) => prev.filter((i) => i.igdb_game_id !== igdbId));
  }

  const EMPTY_MESSAGES = {
    pendiente: { text: 'No tienes juegos pendientes.', sub: '¡Explora juegos para añadir!' },
    jugando:   { text: 'No estás jugando ningún juego ahora mismo', sub: null },
    jugado:    { text: 'Aún no has marcado ningún juego como jugado', sub: null },
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4 pb-10">
        <div className="flex gap-4">
          {[0,1,2].map((i) => <div key={i} className="skeleton-shimmer h-9 w-28 rounded-full" />)}
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="skeleton-shimmer rounded-lg" style={{ aspectRatio: '3/4' }} />
              <div className="skeleton-shimmer h-3 w-3/4 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-[#71717A] text-sm">No se pudo cargar el backlog.</p>
        <button
          onClick={() => { setError(false); setLoading(true); fetch(`/api/users/${username}/backlog`).then((r) => r.ok ? r.json() : Promise.reject()).then((d) => setItems(d.items)).catch(() => setError(true)).finally(() => setLoading(false)); }}
          className="px-4 py-2 rounded-full border border-[#1A1A1A] text-[#71717A] text-sm hover:text-white hover:border-[#3F3F46] transition-colors cursor-pointer"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const totalBacklog = items.length;

  if (totalBacklog === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center pb-10">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3F3F46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="6" width="20" height="12" rx="2"/>
          <path d="M9.5 9.5v5M7 12h5M17 12h.01"/>
        </svg>
        <div className="flex flex-col gap-1">
          <p className="text-white text-sm font-medium">
            {isOwner ? 'Tu backlog está vacío' : 'Este usuario no tiene backlog todavía'}
          </p>
          {isOwner && (
            <p className="text-[#71717A] text-sm">
              <Link href="/search" className="text-[#A855F7] hover:underline">Explora juegos</Link>
              {' '}para añadirlos a tu backlog
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-10">

      {/* ── Status sub-tabs ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {BACKLOG_STATUS_TABS.map((s) => {
          const active = activeStatus === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setActiveStatus(s.key)}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-mono transition-all cursor-pointer"
              style={active ? {
                backgroundColor: `${s.color}20`,
                border: `1px solid ${s.color}60`,
                color: s.color,
              } : {
                backgroundColor: 'transparent',
                border: '1px solid #1A1A1A',
                color: '#71717A',
              }}
            >
              {s.label}
              <span
                className="text-[11px] px-1.5 py-0.5 rounded-full font-bold"
                style={active
                  ? { backgroundColor: `${s.color}30`, color: s.color }
                  : { backgroundColor: '#1A1A1A', color: '#3F3F46' }
                }
              >
                {counts[s.key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Filters bar ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-[#71717A] text-xs font-mono">Ordenar:</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-[#111111] border border-[#1A1A1A] text-white text-xs rounded-lg px-3 py-1.5 cursor-pointer focus:outline-none focus:border-[#A855F7] hover:border-[#3F3F46] transition-colors"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1 ml-auto border border-[#1A1A1A] rounded-lg p-0.5">
          {(['grid', 'list']).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className="p-1.5 rounded transition-colors cursor-pointer"
              style={viewMode === mode
                ? { backgroundColor: '#A855F7', color: '#0A0A0A' }
                : { color: '#71717A' }
              }
              title={mode === 'grid' ? 'Vista cuadrícula' : 'Vista lista'}
            >
              {mode === 'grid' ? <IconGrid size={15} /> : <IconList size={15} />}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#3F3F46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="20" height="12" rx="2"/>
            <path d="M9.5 9.5v5M7 12h5M17 12h.01"/>
          </svg>
          <div className="flex flex-col gap-1">
            <p className="text-white text-sm font-medium">{EMPTY_MESSAGES[activeStatus]?.text}</p>
            {EMPTY_MESSAGES[activeStatus]?.sub && (
              <p className="text-[#71717A] text-sm">{EMPTY_MESSAGES[activeStatus].sub}</p>
            )}
            <Link href="/search" className="text-[#A855F7] text-sm hover:underline mt-1">
              Explorar juegos
            </Link>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
          {sorted.map((item) => (
            <BacklogGridCard
              key={item.igdb_game_id}
              item={item}
              isOwner={isOwner}
              onStatusChange={handleStatusChange}
              onRemove={handleRemove}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col">
          {sorted.map((item) => (
            <BacklogListRow
              key={item.igdb_game_id}
              item={item}
              isOwner={isOwner}
              onStatusChange={handleStatusChange}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Achievement constants ─────────────────────────────────────────────────────

const TIER_COLORS = {
  bronce:    '#CD7F32',
  plata:     '#C0C0C0',
  oro:       '#FFD700',
  diamante:  '#B9F2FF',
  platino:   '#E5E4E2',
  legendario:'#FF6B9D',
};

const TIER_LABELS = {
  bronce:    'Bronce',
  plata:     'Plata',
  oro:       'Oro',
  diamante:  'Diamante',
  platino:   'Platino',
  legendario:'Legendario',
};

const REQ_TYPE_LABELS = {
  ratings_count:   'Puntuaciones',
  reviews_count:   'Reseñas',
  followers_count: 'Seguidores',
  lists_count:     'Listas',
  received_likes:  'Likes',
  backlog_count:   'Backlog',
};


function AchievementCard({ ach, isOwner }) {
  const unlocked     = ach.unlocked;
  const color        = TIER_COLORS[ach.tier] ?? '#A855F7';
  const isLegendario = ach.tier === 'legendario';
  const progress     = ach.progress ?? 0;
  const pct          = ach.requirement_value > 0
    ? Math.min(100, (progress / ach.requirement_value) * 100)
    : 0;

  return (
    <div
      className="relative flex flex-col gap-3 rounded-xl border transition-all duration-300"
      style={{
        padding: '20px',
        ...(unlocked ? {
          backgroundColor: '#151515',
          borderColor: color,
          boxShadow: `0 0 18px ${color}45, 0 0 6px ${color}25`,
          opacity: 1,
          animation: isLegendario ? 'legendario-pulse 2.5s ease-in-out infinite' : undefined,
        } : {
          backgroundColor: '#111111',
          borderColor: 'transparent',
          boxShadow: 'none',
          opacity: 0.4,
        }),
      }}
    >
      {/* Top row: tier badge left, status icon right */}
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
          style={unlocked ? {
            color,
            borderColor: `${color}70`,
            backgroundColor: `${color}20`,
            fontWeight: 600,
          } : {
            color: '#3F3F46',
            borderColor: '#2A2A2A',
            backgroundColor: 'transparent',
          }}
        >
          {TIER_LABELS[ach.tier] ?? ach.tier}
        </span>

        {unlocked ? (
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: color }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2A2A2A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        )}
      </div>

      {/* Achievement image — centered */}
      <div className="flex justify-center">
        <div className="w-16 h-16 md:w-20 md:h-20">
          <Image
            src={getAchievementImage(ach.key)}
            alt={ach.title}
            width={80}
            height={80}
            quality={100}
            style={{
              imageRendering: 'pixelated',
              filter: unlocked ? 'none' : 'grayscale(100%) brightness(0.5)',
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />
        </div>
      </div>

      {/* Title + description */}
      <div className="flex flex-col gap-0.5 flex-1">
        <p className={`text-center text-sm leading-snug ${anton.className} ${unlocked ? 'text-white' : 'text-[#3F3F46]'}`}>
          {ach.title}
        </p>
        <p className={`text-center text-xs leading-relaxed ${unlocked ? 'text-[#9CA3AF]' : 'text-[#3F3F46]'}`}>
          {ach.description}
        </p>
      </div>

      {/* Footer: unlock date or progress bar */}
      <div className="mt-auto">
        {unlocked ? (
          <p className="text-center text-[10px] font-mono" style={{ color }}>
            Desbloqueado el {new Date(ach.unlocked_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        ) : isOwner && ach.progress !== null ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[#3F3F46] text-[10px] font-mono">{progress} / {ach.requirement_value}</span>
              <span className="text-[#3F3F46] text-[10px] font-mono">{Math.round(pct)}%</span>
            </div>
            <div className="w-full h-1 rounded-full bg-[#1A1A1A]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: '#3F3F46' }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LogrosTab({ username, isOwner }) {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState('all');

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    fetch(`/api/users/${username}/achievements`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pb-10">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton-shimmer h-44 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-[#71717A] text-sm">No se pudieron cargar los logros.</p>
      </div>
    );
  }

  const achievements = data.achievements ?? [];
  const unlocked     = achievements.filter((a) => a.unlocked);
  const categories   = ['all', ...Object.keys(REQ_TYPE_LABELS)];
  const visible      = filter === 'all' ? achievements : achievements.filter((a) => a.requirement_type === filter);

  return (
    <div className="flex flex-col gap-6 pb-10">

      {/* Summary */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-2xl">{unlocked.length}</span>
          <span className="text-[#71717A] text-sm">/ {achievements.length} logros desbloqueados</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto flex-wrap">
          {['platino', 'diamante', 'oro', 'plata', 'bronce'].map((tier) => {
            const count = unlocked.filter((a) => a.tier === tier).length;
            if (!count) return null;
            return (
              <div
                key={tier}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono"
                style={{ backgroundColor: `${TIER_COLORS[tier]}20`, color: TIER_COLORS[tier] }}
              >
                <span className="font-bold">{count}</span>
                <span>{TIER_LABELS[tier]}</span>
              </div>
            );
          })}
          {unlocked.filter((a) => a.tier === 'legendario').length > 0 && (
            <div
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono"
              style={{ backgroundColor: `${TIER_COLORS.legendario}20`, color: TIER_COLORS.legendario }}
            >
              <span className="font-bold">{unlocked.filter((a) => a.tier === 'legendario').length}</span>
              <span>{TIER_LABELS.legendario}</span>
            </div>
          )}
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-mono transition-colors cursor-pointer ${
              filter === cat
                ? 'bg-[#A855F7] text-[#0A0A0A] font-semibold'
                : 'border border-[#1A1A1A] text-[#71717A] hover:text-white hover:border-[#3F3F46]'
            }`}
          >
            {cat === 'all' ? 'Todos' : REQ_TYPE_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Grid */}
      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3F3F46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
          </svg>
          <p className="text-white text-sm font-medium">No hay logros en esta categoría</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {visible.map((ach) => (
            <AchievementCard key={ach.key} ach={ach} isOwner={isOwner} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Stats palette ─────────────────────────────────────────────────────────────

const PURPLE_SHADES = ['#A855F7', '#C084FC', '#9333EA', '#7E22CE', '#6B21A8'];
const TOOLTIP_STYLE = {
  backgroundColor: '#111111', border: '1px solid #1A1A1A',
  borderRadius: 8, color: '#FFFFFF', fontSize: 12,
};

// ── Stats sub-components ──────────────────────────────────────────────────────

function StatCard({ label, value, icon, small }) {
  return (
    <div className="flex flex-col gap-3 bg-[#111111] border border-[#1A1A1A] rounded-xl p-4">
      <p className="text-[#71717A] text-[11px] font-mono uppercase tracking-wide leading-none">{label}</p>
      <div className="flex items-center gap-1.5">
        {icon === 'star' && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#A855F7" stroke="#A855F7" strokeWidth="1.5">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        )}
        <p className={`${small ? 'text-xl font-bold' : 'text-4xl font-bold'} text-[#A855F7] leading-none`}>
          {value}
        </p>
      </div>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="flex flex-col gap-5 pb-10 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-[#111111]" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-64 rounded-xl bg-[#111111]" />
        <div className="h-64 rounded-xl bg-[#111111]" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-56 rounded-xl bg-[#111111]" />
        <div className="h-56 rounded-xl bg-[#111111]" />
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="bg-[#111111] border border-[#1A1A1A] rounded-xl p-5 flex flex-col gap-4">
      <div>
        <p className="text-white font-bold text-base leading-snug">{title}</p>
        {subtitle && <p className="text-[#71717A] text-xs mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function StatsTab({ username, isOwner }) {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    fetch(`/api/users/${username}/stats`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) return <StatsSkeleton />;

  if (!stats || stats.empty) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3F3F46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6"  y1="20" x2="6"  y2="14"/>
        </svg>
        <div className="flex flex-col gap-1">
          <p className="text-white text-sm font-medium">
            {isOwner ? 'Puntúa algunos juegos para ver tus estadísticas' : 'Este usuario aún no tiene estadísticas'}
          </p>
          {isOwner && (
            <p className="text-[#71717A] text-sm">
              Las estadísticas aparecerán automáticamente cuando puntúes juegos
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-10">

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Juegos puntuados"   value={stats.totalRated}          />
        <StatCard label="Puntuación media"    value={stats.avgScore}  icon="star" />
        <StatCard label="Género favorito"     value={stats.topGenre    ?? '—'} small />
        <StatCard label="Plataforma favorita" value={stats.topPlatform ?? '—'} small />
      </div>

      {/* ── Row 1: distribution + genres donut ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <ChartCard title="Distribución de puntuaciones" subtitle="Cuántos juegos has puntuado en cada franja">
          {mounted && (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.distribution} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#71717A', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#71717A', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(168,85,247,0.08)' }} />
                <Bar dataKey="count" name="Juegos" fill="#A855F7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {stats.topGenres.length > 0 ? (
          <ChartCard title="Géneros más jugados" subtitle="Top 5 géneros por número de juegos valorados">
            {mounted && (
              <div className="relative">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={stats.topGenres}
                      cx="50%" cy="45%"
                      innerRadius={52} outerRadius={80}
                      dataKey="count" nameKey="name"
                      paddingAngle={3}
                    >
                      {stats.topGenres.map((_, i) => <Cell key={i} fill={PURPLE_SHADES[i]} />)}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend
                      iconType="circle" iconSize={8}
                      formatter={(v) => <span style={{ color: '#A0A0A0', fontSize: 11 }}>{v}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                  <p className="text-white text-2xl font-bold leading-none">{stats.totalRated}</p>
                  <p className="text-[#71717A] text-[10px] mt-0.5">juegos</p>
                </div>
              </div>
            )}
          </ChartCard>
        ) : (
          <ChartCard title="Géneros más jugados" subtitle="No hay suficientes datos aún">
            <div className="flex items-center justify-center h-48">
              <p className="text-[#3F3F46] text-sm">Sin datos</p>
            </div>
          </ChartCard>
        )}

      </div>

      {/* ── Row 2: platforms + activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {stats.topPlatforms.length > 0 ? (
          <ChartCard title="Plataformas favoritas" subtitle="Top 5 plataformas por juegos valorados">
            {mounted && (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats.topPlatforms} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#71717A', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#FFFFFF', fontSize: 10 }} axisLine={false} tickLine={false} width={72} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(168,85,247,0.08)' }} />
                  <Bar dataKey="count" name="Juegos" fill="#A855F7" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        ) : (
          <ChartCard title="Plataformas favoritas" subtitle="No hay suficientes datos aún">
            <div className="flex items-center justify-center h-48">
              <p className="text-[#3F3F46] text-sm">Sin datos</p>
            </div>
          </ChartCard>
        )}

        <ChartCard title="Actividad por año" subtitle="Juegos valorados en los últimos 5 años">
          {mounted && (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={stats.perYear} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#A855F7" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#A855F7" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" vertical={false} />
                <XAxis dataKey="year" tick={{ fill: '#71717A', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#71717A', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: '#A855F7', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area
                  type="monotone" dataKey="count" name="Juegos"
                  stroke="#A855F7" strokeWidth={2}
                  fill="url(#areaGrad)"
                  dot={{ fill: '#A855F7', strokeWidth: 0, r: 4 }}
                  activeDot={{ fill: '#C084FC', strokeWidth: 0, r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

      </div>
    </div>
  );
}

// ── List card (profile context — no creator row) ──────────────────────────────

function CoverCollageProfile({ covers }) {
  return (
    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="relative overflow-hidden bg-[#141414]" style={{ minWidth: 0, minHeight: 0 }}>
          {covers[i] && (
            <Image src={covers[i]} alt="" fill className="object-cover" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
          )}
        </div>
      ))}
    </div>
  );
}

function ProfileListCard({ list }) {
  return (
    <Link
      href={`/lists/${list.id}`}
      className="relative rounded-xl overflow-hidden block h-48 border border-transparent hover:border-[#A855F7] hover:scale-[1.02] transition-all duration-200"
    >
      <CoverCollageProfile covers={list.covers ?? []} />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 40%, rgba(0,0,0,0.3) 100%)' }}
      />
      <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col gap-1.5">
        <div className="flex items-start gap-2">
          <h3 className="text-white font-bold text-sm leading-snug line-clamp-2 flex-1">{list.title}</h3>
          {!list.is_public && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1A1A1A] text-[#52525B] border border-[#2A2A2A] flex-shrink-0">
              Privada
            </span>
          )}
        </div>
        {list.description && (
          <p className="text-[#71717A] text-xs line-clamp-2 leading-relaxed">{list.description}</p>
        )}
        <div className="flex items-center gap-3 text-[#71717A] text-[11px] font-mono mt-0.5">
          <span className="flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
            </svg>
            {list.games_count}
          </span>
          <span className="flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            {list.followers_count}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ── Favoritos components ──────────────────────────────────────────────────────

function Top5Slot({ game, position, isOwner, onPickSlot, onRemove }) {
  const [hovering, setHovering] = useState(false);

  if (!game) {
    return (
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        <div
          className="relative rounded-lg overflow-hidden"
          style={{ aspectRatio: '3/4', backgroundColor: '#141414', border: '2px dashed #2A2A2A' }}
        >
          {isOwner && (
            <button
              onClick={() => onPickSlot(position)}
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#3F3F46] hover:text-[#A855F7] hover:border-[#A855F7] transition-colors cursor-pointer w-full"
              style={{ border: 'none', background: 'none' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span className="text-[10px] font-mono">{position}</span>
            </button>
          )}
          {!isOwner && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[#2A2A2A] font-bold text-2xl font-mono">{position}</span>
            </div>
          )}
        </div>
        <div className="h-4" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 flex-1 min-w-0">
      <div
        className="relative rounded-lg overflow-hidden cursor-pointer"
        style={{ aspectRatio: '3/4' }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <Link href={`/game/${game.igdb_game_id}`} className="absolute inset-0 block">
          {game.cover ? (
            <Image src={game.cover} alt={game.name ?? ''} fill sizes="20vw" className="object-cover" />
          ) : (
            <div className="w-full h-full bg-[#1A1A1A] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3F3F46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="6" width="20" height="12" rx="2"/><path d="M9.5 9.5v5M7 12h5M17 12h.01"/>
              </svg>
            </div>
          )}
        </Link>

        {/* Position badge */}
        <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded bg-black/70 flex items-center justify-center pointer-events-none">
          <span className="text-white text-[10px] font-bold font-mono">{position}</span>
        </div>

        {/* Hover overlay (owner only) */}
        {isOwner && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 transition-opacity duration-150"
            style={{ backgroundColor: 'rgba(0,0,0,0.75)', opacity: hovering ? 1 : 0, pointerEvents: hovering ? 'auto' : 'none' }}
          >
            <p className="text-white text-[10px] font-mono text-center px-2 line-clamp-2">{game.name}</p>
            <button
              onClick={() => onRemove(position)}
              className="flex items-center gap-1 text-red-400 hover:text-red-300 text-[10px] transition-colors cursor-pointer"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              Quitar
            </button>
          </div>
        )}
      </div>

      <Link href={`/game/${game.igdb_game_id}`} className="text-white text-[11px] font-semibold line-clamp-2 leading-snug hover:text-[#A855F7] transition-colors">
        {game.name ?? `#${game.igdb_game_id}`}
      </Link>
    </div>
  );
}

function FavCard({ fav, isOwner, onRemove }) {
  const [hovering, setHovering] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <div
        className="relative rounded-lg overflow-hidden"
        style={{ aspectRatio: '3/4' }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <Link href={`/game/${fav.igdb_game_id}`} className="absolute inset-0 block">
          {fav.cover ? (
            <Image src={fav.cover} alt={fav.name ?? ''} fill sizes="(max-width: 768px) 33vw, 20vw" className="object-cover" />
          ) : (
            <div className="w-full h-full bg-[#1A1A1A] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3F3F46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="6" width="20" height="12" rx="2"/><path d="M9.5 9.5v5M7 12h5M17 12h.01"/>
              </svg>
            </div>
          )}
        </Link>

        {isOwner && (
          <div
            className="absolute inset-0 flex items-center justify-center transition-opacity duration-150"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)', opacity: hovering ? 1 : 0, pointerEvents: hovering ? 'auto' : 'none' }}
          >
            <button
              onClick={() => onRemove(fav.igdb_game_id)}
              className="flex flex-col items-center gap-1 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="currentColor" />
              </svg>
              <span className="text-[10px] font-mono">Quitar</span>
            </button>
          </div>
        )}
      </div>

      <Link href={`/game/${fav.igdb_game_id}`} className="text-white text-[11px] font-semibold line-clamp-2 leading-snug hover:text-[#A855F7] transition-colors">
        {fav.name ?? `#${fav.igdb_game_id}`}
      </Link>
      {fav.year && <span className="text-[#71717A] text-[10px] font-mono">{fav.year}</span>}
    </div>
  );
}

function TopGamePickModal({ topGames, onSelect, onClose }) {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef(null);

  const occupiedIds = new Set(topGames.map((g) => g.igdb_game_id));

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/games/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults(Array.isArray(data) ? data.filter((g) => !occupiedIds.has(g.id)) : []);
        }
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-[#1A1A1A] flex flex-col gap-4 p-6"
        style={{ backgroundColor: '#111111', maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className={`${anton.className} text-white text-xl`}>Elegir juego</h2>
          <button onClick={onClose} className="text-[#71717A] hover:text-white transition-colors cursor-pointer">
            <IconX size={18} />
          </button>
        </div>

        <input
          autoFocus
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar juego..."
          className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-[#71717A] focus:outline-none focus:border-[#A855F7] transition-colors"
        />

        <div className="overflow-y-auto flex-1 min-h-0 flex flex-col gap-1" style={{ maxHeight: '50vh' }}>
          {searching ? (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 rounded-full border-2 border-[#A855F7] border-t-transparent animate-spin" />
            </div>
          ) : results.length === 0 && query.trim() ? (
            <p className="text-[#71717A] text-sm text-center py-6">Sin resultados</p>
          ) : results.length === 0 ? (
            <p className="text-[#71717A] text-sm text-center py-6">Empieza a escribir para buscar</p>
          ) : (
            results.map((game) => (
              <button
                key={game.id}
                onClick={() => { onSelect(game); onClose(); }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#1A1A1A] transition-colors cursor-pointer text-left w-full"
              >
                <div className="relative w-9 h-12 rounded overflow-hidden flex-shrink-0 bg-[#141414]">
                  {game.cover && <Image src={game.cover} alt={game.name} fill sizes="36px" className="object-cover" />}
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-white text-sm font-semibold line-clamp-1">{game.name}</span>
                  {game.year && <span className="text-[#71717A] text-[11px] font-mono">{game.year}</span>}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ReviewCard({ review, token, viewerUsername, reviewAuthorUsername }) {
  const [liked,             setLiked]             = useState(review.viewer_liked  ?? false);
  const [likesCount,        setLikesCount]        = useState(review.likes_count   ?? 0);
  const [heartAnim,         setHeartAnim]         = useState(false);
  const [liking,            setLiking]            = useState(false);
  const [commentsExpanded,  setCommentsExpanded]  = useState(false);
  const [commentsCount,     setCommentsCount]     = useState(review.comments_count ?? 0);
  const [shareOpen,         setShareOpen]         = useState(false);
  const [reportOpen,        setReportOpen]        = useState(false);

  async function handleLike() {
    if (!token) return;
    if (liking) return;
    setLiking(true);
    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount((c) => c + (newLiked ? 1 : -1));
    setHeartAnim(true);
    setTimeout(() => setHeartAnim(false), 600);
    try {
      const res = await fetch(`/api/reviews/${review.id}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLiked(data.liked);
        setLikesCount(data.likes_count);
      } else {
        setLiked(!newLiked);
        setLikesCount((c) => c - (newLiked ? 1 : -1));
      }
    } catch {
      setLiked(!newLiked);
      setLikesCount((c) => c - (newLiked ? 1 : -1));
    } finally {
      setLiking(false);
    }
  }

  return (
    <div className="flex flex-col border-b border-[#1A1A1A]">
      <div className="flex gap-5 py-5">
        <Link href={`/game/${review.igdb_game_id}`} className="flex-shrink-0">
          <div className="relative w-[90px] h-[120px] rounded-lg overflow-hidden bg-[#141414]">
            {review.cover
              ? <Image src={review.cover} alt={review.name ?? ''} fill className="object-cover" />
              : <div className="w-full h-full bg-[#1A1A1A]" />
            }
          </div>
        </Link>
        <div className={`${inter.className} flex flex-col gap-2 flex-1 min-w-0`}>
          <div className="flex items-center justify-between gap-4">
            <Link href={`/game/${review.igdb_game_id}`} className="text-white text-base font-semibold leading-snug hover:text-[#A855F7] transition-colors">
              {review.name ?? `Juego #${review.igdb_game_id}`}
            </Link>
            <span className="text-[#71717A] font-mono text-[11px] whitespace-nowrap flex-shrink-0">{formatDate(review.created_at)}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {review.score && <StarRating value={review.score} size={13} />}
            {review.genre && (
              <>
                <span className="text-[#71717A] text-xs">•</span>
                <span className="text-[#71717A] font-mono text-[11px]">{review.genre}</span>
              </>
            )}
          </div>
          <p className="text-[#71717A] text-sm leading-relaxed line-clamp-4">{review.content}</p>

          {/* Action row */}
          <div className="flex items-center gap-4 pt-1">
            {/* Like */}
            <button
              onClick={handleLike}
              disabled={liking || !token}
              className={`flex items-center gap-1.5 text-xs transition-colors cursor-pointer disabled:cursor-default ${
                liked ? 'text-[#A855F7]' : 'text-[#71717A] hover:text-white'
              }`}
            >
              <span className="relative inline-flex items-center justify-center">
                <span className={heartAnim ? 'heart-burst' : ''}>
                  <IconHeart size={14} filled={liked} color={liked ? '#A855F7' : 'currentColor'} />
                </span>
                {heartAnim && (
                  <span
                    className="heart-ring absolute inset-[-4px] rounded-full pointer-events-none"
                    style={{ border: `2px solid ${liked ? '#A855F7' : '#888'}` }}
                  />
                )}
              </span>
              <span>{likesCount > 0 ? likesCount : ''}</span>
            </button>
            {/* Comments */}
            <button
              onClick={() => setCommentsExpanded((v) => !v)}
              className={`flex items-center gap-1.5 text-xs transition-colors cursor-pointer ${
                commentsExpanded ? 'text-[#A855F7]' : 'text-[#71717A] hover:text-white'
              }`}
            >
              <IconMessage />
              <span>{commentsCount > 0 ? commentsCount : ''} Comentarios</span>
            </button>
            {/* Share */}
            <button
              onClick={() => setShareOpen(true)}
              className="flex items-center gap-1.5 text-[#71717A] hover:text-white text-xs transition-colors cursor-pointer ml-auto"
              title="Compartir reseña"
            >
              <IconShare />
            </button>
            {/* Report — only show to other logged-in users */}
            {viewerUsername && viewerUsername !== reviewAuthorUsername && (
              <button
                onClick={() => setReportOpen(true)}
                className="flex items-center gap-1.5 text-[#71717A] hover:text-red-400 text-xs transition-colors cursor-pointer"
                title="Reportar reseña"
              >
                <IconFlag />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Comments section */}
      {commentsExpanded && (
        <div className="pb-4">
          <ReviewCommentsSection
            reviewId={review.id}
            reviewAuthorUsername={reviewAuthorUsername}
            currentUsername={viewerUsername}
            onCountChange={(c) => setCommentsCount(c)}
          />
        </div>
      )}

      {/* Report modal */}
      {reportOpen && (
        <ReportModal
          targetType="review"
          targetId={review.id}
          onClose={() => setReportOpen(false)}
        />
      )}

      {/* Share modal */}
      {shareOpen && (
        <ShareModal
          gameId={review.igdb_game_id}
          gameName={review.name ?? null}
          gameCover={review.cover ?? null}
          gameYear={null}
          gameGenre={review.genre ?? null}
          userScore={review.score != null ? parseFloat(review.score) : null}
          reviewContent={review.content}
          username={reviewAuthorUsername}
          reviewId={review.id}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
}

function GameCard({ rating }) {
  return (
    <Link href={`/game/${rating.igdb_game_id}`} className="flex flex-col gap-2 group">
      <div className="relative aspect-[3/4] w-full rounded-lg overflow-hidden bg-[#141414]">
        {rating.cover
          ? <Image src={rating.cover} alt={rating.name ?? ''} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full bg-[#1A1A1A]" />
        }
      </div>
      <span className={`${inter.className} text-white text-[12px] font-semibold leading-snug line-clamp-2`}>
        {rating.name ?? `#${rating.igdb_game_id}`}
      </span>
      <StarRating value={rating.score} size={12} />
    </Link>
  );
}

// ── Follow modal ──────────────────────────────────────────────────────────────

function UserRow({ user, token, viewerUsername }) {
  const [following,  setFollowing]  = useState(user.is_following ?? false);
  const [loading,    setLoading]    = useState(false);

  async function toggleFollow() {
    if (!token || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${user.username}/follow`, {
        method: 'POST',
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

  const isOwnRow = viewerUsername && viewerUsername === user.username;

  return (
    <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#1A1A1A] last:border-0">
      <Link href={`/user/${user.username}`}>
        <Avatar user={user} size={40} />
      </Link>
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <Link href={`/user/${user.username}`} className="text-white text-sm font-semibold hover:text-[#A855F7] transition-colors leading-snug">
          {user.nombre} {user.apellido}
        </Link>
        <span className="text-[#71717A] text-xs font-mono">@{user.username}</span>
        {user.bio && <p className="text-[#71717A] text-xs line-clamp-1 mt-0.5">{user.bio}</p>}
      </div>
      {!isOwnRow && token && (
        <button
          onClick={toggleFollow}
          disabled={loading}
          className={[
            'group flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 min-h-[32px] flex items-center gap-1',
            following
              ? 'border border-[#3F3F46] text-white hover:border-red-500 hover:text-red-400'
              : 'bg-[#A855F7] text-[#0A0A0A] hover:bg-[#9333EA]',
          ].join(' ')}
        >
          {following ? (
            <>
              <svg className="hidden group-hover:block flex-shrink-0" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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

function FollowModal({ title, users, loading, token, viewerUsername, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-[#1A1A1A] overflow-hidden flex flex-col"
        style={{ backgroundColor: '#111111', maxHeight: '75vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1A1A1A] flex-shrink-0">
          <span className={`${anton.className} text-white text-xl`}>{title}</span>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-[#71717A] hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-[#1A1A1A]"
          >
            <IconX size={17} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <span className="text-[#71717A] text-sm">Cargando...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-[#71717A] text-sm">No hay usuarios que mostrar</p>
            </div>
          ) : (
            users.map((user) => (
              <UserRow key={user.username} user={user} token={token} viewerUsername={viewerUsername} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Diary ─────────────────────────────────────────────────────────────────────

function DiaryEntryRow({ entry }) {
  const date = new Date(entry.created_at);
  const day  = date.getDate();
  const formattedDate = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="flex items-center gap-3 sm:gap-4 py-3 border-b border-[#1A1A1A] group">
      {/* Day badge */}
      <div className="w-7 flex-shrink-0 text-right">
        <span className="text-[#3F3F46] group-hover:text-[#71717A] font-mono text-sm font-bold transition-colors">
          {day}
        </span>
      </div>

      {/* Cover */}
      <Link href={`/game/${entry.igdb_game_id}`} className="flex-shrink-0">
        <div className="relative w-9 h-12 rounded overflow-hidden bg-[#141414] hover:opacity-80 transition-opacity">
          {entry.cover ? (
            <Image src={entry.cover} alt={entry.name ?? ''} fill sizes="36px" className="object-cover" />
          ) : (
            <div className="w-full h-full bg-[#1A1A1A] flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3F3F46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="6" width="20" height="12" rx="2"/>
              </svg>
            </div>
          )}
        </div>
      </Link>

      {/* Game name */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/game/${entry.igdb_game_id}`}
          className="text-white text-sm font-semibold hover:text-[#A855F7] transition-colors line-clamp-1 leading-snug"
        >
          {entry.name ?? `Juego #${entry.igdb_game_id}`}
        </Link>
      </div>

      {/* Stars */}
      <div className="flex-shrink-0">
        <StarRating value={entry.score} size={12} />
      </div>

      {/* Full date — hidden on mobile */}
      <div className="hidden sm:block flex-shrink-0 w-28 text-right">
        <span className="text-[#3F3F46] group-hover:text-[#71717A] text-[11px] font-mono transition-colors">
          {formattedDate}
        </span>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function UserProfilePage({ params }) {
  const { username } = use(params);
  const [activeTab,      setActiveTab]      = useState('Reseñas');
  const tabListRef     = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const [profile,        setProfile]        = useState(null);
  const [reviews,        setReviews]        = useState([]);
  const [ratings,        setRatings]        = useState([]);
  const [achievements,   setAchievements]   = useState([]);
  const [isOwner,        setIsOwner]        = useState(false);
  const [token,          setToken]          = useState(null);
  const [viewerUsername, setViewerUsername] = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [notFound,       setNotFound]       = useState(false);

  // Follow state
  const [isFollowing,    setIsFollowing]    = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followLoading,  setFollowLoading]  = useState(false);

  // Modal state
  const [modalType,    setModalType]    = useState(null); // 'followers' | 'following'
  const [modalUsers,   setModalUsers]   = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  // Lists tab state (lazy-loaded on first visit to the tab)
  const [lists,        setLists]        = useState([]);
  const [listsLoading, setListsLoading] = useState(false);
  const [listsLoaded,  setListsLoaded]  = useState(false);

  // Favoritos tab state (lazy-loaded)
  const [favorites,        setFavorites]        = useState([]);
  const [topGames,         setTopGames]         = useState([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [favoritesLoaded,  setFavoritesLoaded]  = useState(false);
  const [pickSlot,         setPickSlot]         = useState(null); // position 1-5 being picked

  // Sort state for Juegos and Reseñas tabs
  const [ratingsSort, setRatingsSort] = useState('recent');
  const [reviewsSort, setReviewsSort] = useState('recent');

  const sortedRatings = useMemo(() => {
    if (!ratings.length) return ratings;
    const arr = [...ratings];
    switch (ratingsSort) {
      case 'oldest':
        return arr.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      case 'score_desc':
        return arr.sort((a, b) => parseFloat(b.score ?? 0) - parseFloat(a.score ?? 0));
      case 'score_asc':
        return arr.sort((a, b) => parseFloat(a.score ?? 0) - parseFloat(b.score ?? 0));
      case 'name_asc':
        return arr.sort((a, b) => {
          if (!a.name && !b.name) return 0;
          if (!a.name) return 1;
          if (!b.name) return -1;
          return a.name.localeCompare(b.name, 'es');
        });
      case 'year_desc':
        return arr.sort((a, b) => {
          if (b.year == null && a.year == null) return 0;
          if (b.year == null) return -1;
          if (a.year == null) return 1;
          return b.year - a.year;
        });
      default: // 'recent' — already ordered by created_at DESC from the API
        return arr;
    }
  }, [ratings, ratingsSort]);

  const sortedReviews = useMemo(() => {
    if (!reviews.length) return reviews;
    const arr = [...reviews];
    switch (reviewsSort) {
      case 'oldest':
        return arr.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      case 'score_desc':
        return arr.sort((a, b) => parseFloat(b.score ?? 0) - parseFloat(a.score ?? 0));
      case 'score_asc':
        return arr.sort((a, b) => parseFloat(a.score ?? 0) - parseFloat(b.score ?? 0));
      case 'likes_desc':
        return arr.sort((a, b) => (b.likes_count ?? 0) - (a.likes_count ?? 0));
      case 'name_asc':
        return arr.sort((a, b) => {
          if (!a.name && !b.name) return 0;
          if (!a.name) return 1;
          if (!b.name) return -1;
          return a.name.localeCompare(b.name, 'es');
        });
      default: // 'recent' — already ordered by created_at DESC from the API
        return arr;
    }
  }, [reviews, reviewsSort]);

  // Diary: group ratings by month (ratings already DESC from API)
  const diaryGroups = useMemo(() => {
    if (!ratings.length) return [];
    const groups = [];
    let current = null;
    for (const entry of ratings) {
      const d   = new Date(entry.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!current || current.key !== key) {
        current = { key, label: `${MESES[d.getMonth()]} ${d.getFullYear()}`, entries: [] };
        groups.push(current);
      }
      current.entries.push(entry);
    }
    return groups;
  }, [ratings]);

  useEffect(() => {
    if (!username) return;

    async function load() {
      try {
        const t = localStorage.getItem('token');
        setToken(t);

        const profileRes = await fetch(`/api/users/${username}`, {
          headers: t ? { Authorization: `Bearer ${t}` } : {},
        });
        if (!profileRes.ok) { setNotFound(true); setLoading(false); return; }
        const { user } = await profileRes.json();
        setProfile(user);
        setIsFollowing(user.is_following ?? false);
        setFollowersCount(user.total_followers ?? 0);

        const [revRes, ratRes, achRes, topRes] = await Promise.all([
          fetch(`/api/users/${username}/reviews`, { headers: t ? { Authorization: `Bearer ${t}` } : {} }),
          fetch(`/api/users/${username}/ratings`),
          fetch(`/api/users/${username}/achievements`, {
            headers: t ? { Authorization: `Bearer ${t}` } : {},
          }),
          fetch(`/api/users/${username}/top-games`),
        ]);
        if (revRes.ok) setReviews(await revRes.json());
        if (ratRes.ok) setRatings(await ratRes.json());
        if (achRes.ok) {
          const achData = await achRes.json();
          setAchievements(achData.achievements ?? []);
        }
        if (topRes.ok) setTopGames(await topRes.json());

        if (t) {
          const meRes = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${t}` } });
          if (meRes.ok) {
            const { user: me } = await meRes.json();
            setViewerUsername(me.username);
            if (me.username === username) {
              setIsOwner(true);
              setActiveTab('Estadísticas');
            }
          }
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [username]);

  function updateIndicator(tab) {
    const list = tabListRef.current;
    if (!list) return;
    const btn = list.querySelector(`[data-tab="${tab}"]`);
    if (!btn) return;
    const listRect = list.getBoundingClientRect();
    const btnRect  = btn.getBoundingClientRect();
    setIndicatorStyle({ left: btnRect.left - listRect.left, width: btnRect.width });
  }

  useEffect(() => { setTimeout(() => updateIndicator(activeTab), 30); }, [activeTab]);

  // Lazy-load lists when the Listas tab is first opened
  useEffect(() => {
    if (activeTab !== 'Listas' || listsLoaded || loading) return;
    setListsLoading(true);
    fetch(`/api/users/${username}/lists`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setLists(Array.isArray(data) ? data : []))
      .catch(() => setLists([]))
      .finally(() => { setListsLoading(false); setListsLoaded(true); });
  }, [activeTab, listsLoaded, loading, username, token]);

  // Lazy-load favorites when Favoritos tab is first opened
  useEffect(() => {
    if (activeTab !== 'Favoritos' || favoritesLoaded || loading) return;
    setFavoritesLoading(true);
    fetch(`/api/users/${username}/favorites`)
      .then((r) => r.ok ? r.json() : []).catch(() => [])
      .then((favs) => setFavorites(Array.isArray(favs) ? favs : []))
      .finally(() => { setFavoritesLoading(false); setFavoritesLoaded(true); });
  }, [activeTab, favoritesLoaded, loading, username]);

  async function handleSetTopGame(game, position) {
    const t = token ?? localStorage.getItem('token');
    if (!t) return;
    const res = await fetch('/api/favorites/top', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ igdb_game_id: game.id, position }),
    });
    if (res.ok) {
      setTopGames((prev) => {
        const filtered = prev.filter((g) => g.position !== position);
        return [...filtered, { igdb_game_id: game.id, position, name: game.name, cover: game.cover, year: game.year }]
          .sort((a, b) => a.position - b.position);
      });
    }
  }

  async function handleRemoveTopGame(position) {
    const t = token ?? localStorage.getItem('token');
    if (!t) return;
    const res = await fetch(`/api/favorites/top/${position}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${t}` },
    });
    if (res.ok) setTopGames((prev) => prev.filter((g) => g.position !== position));
  }

  async function handleRemoveFavorite(igdbGameId) {
    const t = token ?? localStorage.getItem('token');
    if (!t) return;
    const res = await fetch(`/api/favorites/${igdbGameId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${t}` },
    });
    if (res.ok) setFavorites((prev) => prev.filter((f) => f.igdb_game_id !== igdbGameId));
  }

  async function handleFollow() {
    if (!token) return;
    if (followLoading || isOwner) return;
    setFollowLoading(true);
    try {
      const res = await fetch(`/api/users/${username}/follow`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setIsFollowing(data.following);
        setFollowersCount(data.followers_count);
      }
    } finally {
      setFollowLoading(false);
    }
  }

  async function openModal(type) {
    setModalType(type);
    setModalUsers([]);
    setModalLoading(true);
    try {
      const res = await fetch(`/api/users/${username}/${type}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) setModalUsers(await res.json());
    } finally {
      setModalLoading(false);
    }
  }

  // ── Loading / not found ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <span className="text-[#71717A] text-sm">Cargando perfil...</span>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className={`${inter.className} min-h-screen bg-[#0A0A0A] w-full`}>
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <p className="text-[#71717A] text-sm">Usuario no encontrado.</p>
        </div>
      </div>
    );
  }

  const stats = [
    { value: profile.total_ratings,   label: 'Juegos',     onClick: null },
    { value: profile.total_reviews,   label: 'Reseñas',    onClick: null },
    { value: profile.total_backlog,   label: 'Backlog',    onClick: () => setActiveTab('Backlog') },
    { value: followersCount,          label: 'Seguidores', onClick: () => openModal('followers') },
    { value: profile.total_following, label: 'Siguiendo',  onClick: () => openModal('following') },
  ];

  const recentAchievements = achievements
    .filter((a) => a.unlocked)
    .sort((a, b) => new Date(b.unlocked_at) - new Date(a.unlocked_at))
    .slice(0, 3);

  return (
    <div className={`${inter.className} min-h-screen bg-[#0A0A0A] w-full`}>

      <Navbar />

      {/* ── Profile Header ── */}
      <div className="flex flex-col">

        {/* Banner */}
        <div className="relative h-[200px] w-full overflow-hidden">
          <Image src="/images/1.png" alt="Profile banner" fill className="object-cover" priority />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 0%, #0A0A0A 85%)' }} />
        </div>

        {/* Profile Info row */}
        <div className="flex flex-wrap items-center gap-4 md:gap-6 px-4 md:px-12 py-6">

          {/* Avatar */}
          <div className="relative w-24 h-24 flex-shrink-0" style={{ marginTop: '-48px' }}>
            <Avatar user={profile} size={96} className="ring-4 ring-[#0A0A0A]" />
          </div>

          {/* Name + username + bio */}
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <span className={`${anton.className} text-white text-[28px] leading-tight`}>
              {profile.nombre} {profile.apellido}
            </span>
            <span className="text-[#71717A] font-mono text-sm">@{profile.username}</span>
            {profile.bio && (
              <p className="text-[#71717A] text-sm leading-[1.5] max-w-xl">{profile.bio}</p>
            )}
          </div>

          {/* Stats */}
          <div className="flex flex-col gap-3 flex-shrink-0">
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className={`flex flex-col items-center gap-0.5 ${s.onClick ? 'cursor-pointer hover:opacity-75 transition-opacity' : ''}`}
                  onClick={s.onClick ?? undefined}
                >
                  <span className={`${anton.className} text-white text-2xl`}>{s.value ?? 0}</span>
                  <span className="text-[#71717A] font-mono text-[11px] uppercase tracking-wide">{s.label}</span>
                </div>
              ))}
            </div>
            {/* Mini achievements preview */}
            {recentAchievements.length > 0 && (
              <button
                onClick={() => setActiveTab('Logros')}
                className="flex items-center gap-2 group cursor-pointer"
              >
                <div className="flex items-center gap-1">
                  {recentAchievements.map((a) => (
                    <div
                      key={a.key}
                      title={a.title}
                      className="w-12 h-12 flex-shrink-0 transition-transform group-hover:scale-110"
                    >
                      <Image
                        src={getAchievementImage(a.key)}
                        alt={a.title}
                        width={48}
                        height={48}
                        quality={100}
                        style={{ imageRendering: 'pixelated', width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </div>
                  ))}
                </div>
                <span className="text-[#71717A] font-mono text-[10px] group-hover:text-white transition-colors">
                  {achievements.filter((a) => a.unlocked).length} logros
                </span>
              </button>
            )}
          </div>

          {/* Edit / Follow button */}
          {isOwner ? (
            <Link
              href="/settings"
              className="px-6 py-2.5 rounded-full border border-[#3F3F46] text-white text-sm font-semibold hover:border-[#A855F7] transition-colors flex-shrink-0"
            >
              Editar perfil
            </Link>
          ) : (
            <button
              onClick={handleFollow}
              disabled={followLoading}
              className={[
                'group px-6 py-2.5 rounded-full text-sm font-semibold transition-colors flex-shrink-0 cursor-pointer disabled:opacity-60 flex items-center gap-1.5',
                isFollowing
                  ? 'border border-[#3F3F46] text-white hover:border-red-500 hover:text-red-400'
                  : 'bg-[#A855F7] text-[#0A0A0A] hover:bg-[#9333EA]',
              ].join(' ')}
            >
              {followLoading ? '...' : isFollowing ? (
                <>
                  <svg className="hidden group-hover:block flex-shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  <span className="group-hover:hidden">Siguiendo</span>
                  <span className="hidden group-hover:inline">Dejar de seguir</span>
                </>
              ) : 'Seguir'}
            </button>
          )}

        </div>
      </div>

      {/* ── Top 5 Showcase ── */}
      {(isOwner || topGames.length > 0) && (
        <div className="px-4 md:px-12 py-5 border-b border-[#1A1A1A]">
          <div className="flex flex-col gap-3">
            <span className={`${anton.className} text-white text-lg`}>Top 5</span>
            <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-1">
              {isOwner ? (
                [1, 2, 3, 4, 5].map((pos) => {
                  const game = topGames.find((g) => g.position === pos) ?? null;
                  return (
                    <div key={pos} className="w-16 sm:w-[90px] md:w-[108px] flex-shrink-0">
                      <Top5Slot
                        game={game}
                        position={pos}
                        isOwner={true}
                        onPickSlot={setPickSlot}
                        onRemove={handleRemoveTopGame}
                      />
                    </div>
                  );
                })
              ) : (
                topGames.map((game) => (
                  <div key={game.position} className="w-16 sm:w-[90px] md:w-[108px] flex-shrink-0">
                    <Top5Slot
                      game={game}
                      position={game.position}
                      isOwner={false}
                      onPickSlot={() => {}}
                      onRemove={() => {}}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tabs + Content ── */}
      <div className="flex flex-col gap-6 px-12">

        <div className="relative flex border-b border-[#1A1A1A] overflow-x-auto scrollbar-hide" ref={tabListRef}>
          {/* Sliding active indicator */}
          <div
            className="absolute bottom-[-1px] h-[2px] bg-[#A855F7] pointer-events-none"
            style={{
              left: indicatorStyle.left,
              width: indicatorStyle.width,
              transition: 'left 200ms cubic-bezier(0.4, 0, 0.2, 1), width 200ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
          {TABS.map((tab) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                data-tab={tab}
                onClick={() => setActiveTab(tab)}
                className={[
                  'px-6 py-3 text-sm transition-colors cursor-pointer whitespace-nowrap flex-shrink-0',
                  active ? 'text-white font-semibold' : 'text-[#71717A] hover:text-white font-normal',
                ].join(' ')}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Reseñas tab */}
        {activeTab === 'Reseñas' && (
          <div key="tab-resenas" className="tab-content flex flex-col pb-10">
            {reviews.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-20 text-center">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3F3F46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <div className="flex flex-col gap-1">
                  <p className="text-white text-sm font-medium">
                    {isOwner ? 'Todavía no has escrito ninguna reseña' : 'Este usuario aún no ha escrito reseñas'}
                  </p>
                  {isOwner && (
                    <p className="text-[#71717A] text-sm">
                      <Link href="/search" className="text-[#A855F7] hover:underline">Explora el catálogo</Link>{' '}
                      y puntúa tus juegos favoritos
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-end gap-2 mb-2">
                  <span className="text-[#71717A] text-xs font-mono">Ordenar por:</span>
                  <select
                    value={reviewsSort}
                    onChange={(e) => setReviewsSort(e.target.value)}
                    className="bg-[#111111] border border-[#1A1A1A] text-white text-xs rounded-lg px-3 py-1.5 cursor-pointer focus:outline-none focus:border-[#A855F7] hover:border-[#3F3F46] transition-colors"
                  >
                    <option value="recent">Más recientes</option>
                    <option value="oldest">Más antiguas</option>
                    <option value="score_desc">Mejor valoradas</option>
                    <option value="score_asc">Peor valoradas</option>
                    <option value="likes_desc">Más gustadas</option>
                    <option value="name_asc">Nombre del juego (A-Z)</option>
                  </select>
                </div>
                {sortedReviews.map((r) => (
                  <ReviewCard
                    key={r.id}
                    review={r}
                    token={token}
                    viewerUsername={viewerUsername}
                    reviewAuthorUsername={username}
                  />
                ))}
              </>
            )}
          </div>
        )}

        {/* Juegos tab */}
        {activeTab === 'Juegos' && (
          <div key="tab-juegos" className="tab-content pb-10">
            {ratings.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-20 text-center">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3F3F46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="6" width="20" height="12" rx="2" />
                  <path d="M12 12h.01" /><path d="M7 12h.01" /><path d="M17 12h.01" />
                  <path d="M9.5 9.5v5" /><path d="M7 12h5" />
                </svg>
                <div className="flex flex-col gap-1">
                  <p className="text-white text-sm font-medium">
                    {isOwner ? 'Todavía no has puntuado ningún juego' : 'Este usuario aún no ha valorado ningún juego'}
                  </p>
                  {isOwner && (
                    <p className="text-[#71717A] text-sm">
                      <Link href="/search" className="text-[#A855F7] hover:underline">¡Explora el catálogo!</Link>
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-end gap-2 mb-5">
                  <span className="text-[#71717A] text-xs font-mono">Ordenar por:</span>
                  <select
                    value={ratingsSort}
                    onChange={(e) => setRatingsSort(e.target.value)}
                    className="bg-[#111111] border border-[#1A1A1A] text-white text-xs rounded-lg px-3 py-1.5 cursor-pointer focus:outline-none focus:border-[#A855F7] hover:border-[#3F3F46] transition-colors"
                  >
                    <option value="recent">Añadido recientemente</option>
                    <option value="oldest">Añadido hace más tiempo</option>
                    <option value="score_desc">Mejor valorados</option>
                    <option value="score_asc">Peor valorados</option>
                    <option value="name_asc">Nombre (A-Z)</option>
                    <option value="year_desc">Año de lanzamiento (más nuevos)</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                  {sortedRatings.map((r) => <GameCard key={r.igdb_game_id} rating={r} />)}
                </div>
              </>
            )}
          </div>
        )}

        {/* Listas tab */}
        {activeTab === 'Listas' && (
          <div key="tab-listas" className="tab-content pb-10">
            {listsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="skeleton-shimmer h-48 rounded-xl" />
                ))}
              </div>
            ) : lists.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-20 text-center">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3F3F46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                  <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
                <div className="flex flex-col gap-1">
                  <p className="text-white text-sm font-medium">
                    {isOwner ? 'Aún no has creado ninguna lista' : 'Este usuario aún no tiene listas públicas'}
                  </p>
                  {isOwner && (
                    <Link href="/lists" className="text-[#A855F7] text-sm hover:underline mt-1">
                      Crear mi primera lista →
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {lists.map((list) => (
                  <ProfileListCard key={list.id} list={list} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Backlog tab */}
        {activeTab === 'Backlog' && (
          <div key="tab-backlog" className="tab-content">
            <BacklogTab username={username} isOwner={isOwner} token={token} />
          </div>
        )}

        {/* Favoritos tab */}
        {activeTab === 'Favoritos' && (
          <div key="tab-favoritos" className="tab-content pb-10">
            {favoritesLoading ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <div className="skeleton-shimmer rounded-lg" style={{ aspectRatio: '3/4' }} />
                    <div className="skeleton-shimmer h-3 w-3/4 rounded" />
                  </div>
                ))}
              </div>
            ) : favorites.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-20 text-center">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3F3F46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                <div className="flex flex-col gap-1">
                  <p className="text-white text-sm font-medium">
                    {isOwner ? 'Aún no tienes juegos favoritos' : 'Este usuario aún no tiene favoritos'}
                  </p>
                  {isOwner && (
                    <p className="text-[#71717A] text-sm">
                      Usa el botón <span className="text-[#EF4444]">♥ Favorito</span> en cualquier juego para añadirlo
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                {favorites.map((fav) => (
                  <FavCard
                    key={fav.igdb_game_id}
                    fav={fav}
                    isOwner={isOwner}
                    onRemove={handleRemoveFavorite}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Estadísticas tab */}
        {activeTab === 'Estadísticas' && (
          <div key="tab-stats" className="tab-content">
            <StatsTab username={username} isOwner={isOwner} />
          </div>
        )}

        {/* Logros tab */}
        {activeTab === 'Logros' && (
          <div key="tab-logros" className="tab-content">
            <LogrosTab username={username} isOwner={isOwner} />
          </div>
        )}

        {/* Diario tab */}
        {activeTab === 'Diario' && (
          <div key="tab-diario" className="tab-content pb-10">
            {ratings.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-20 text-center">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3F3F46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <div className="flex flex-col gap-1">
                  <p className="text-white text-sm font-medium">
                    {isOwner ? 'Tu diario está vacío' : 'Este usuario aún no tiene actividad en su diario'}
                  </p>
                  {isOwner && (
                    <p className="text-[#71717A] text-sm">
                      <Link href="/search" className="text-[#A855F7] hover:underline">Puntúa juegos</Link>
                      {' '}para registrar tu actividad
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-8">
                {diaryGroups.map((group) => (
                  <div key={group.key}>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className={`${anton.className} text-white text-xl`}>{group.label}</h3>
                      <span className="text-[#3F3F46] text-xs font-mono">{group.entries.length}</span>
                    </div>
                    <div className="flex flex-col">
                      {group.entries.map((entry) => (
                        <DiaryEntryRow key={`${entry.igdb_game_id}-${entry.created_at}`} entry={entry} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Follow modal ── */}
      {modalType && (
        <FollowModal
          title={modalType === 'followers' ? 'Seguidores' : 'Siguiendo'}
          users={modalUsers}
          loading={modalLoading}
          token={token}
          viewerUsername={viewerUsername}
          onClose={() => setModalType(null)}
        />
      )}

      {/* ── Top game pick modal ── */}
      {pickSlot !== null && (
        <TopGamePickModal
          topGames={topGames}
          onSelect={(game) => handleSetTopGame(game, pickSlot)}
          onClose={() => setPickSlot(null)}
        />
      )}

    </div>
  );
}
