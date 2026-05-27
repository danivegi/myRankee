'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Inter } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';
import Avatar from '@/app/components/Avatar';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

// ── Icons ──────────────────────────────────────────────────────────────────────

function IconSearch({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconX({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconMenu({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function IconBell({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );
}


// ── Search overlay ─────────────────────────────────────────────────────────────

function SearchBox({ onClose }) {
  const router   = useRouter();
  const [query,   setQuery]   = useState('');
  const [games,   setGames]   = useState([]);
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef  = useRef(null);
  const timerRef  = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!query.trim()) { setGames([]); setUsers([]); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const q = encodeURIComponent(query.trim());
        const [gRes, uRes] = await Promise.all([
          fetch(`/api/games/search?q=${q}`),
          fetch(`/api/users/search?q=${q}`),
        ]);
        const gData = await gRes.json();
        const uData = await uRes.json();
        setGames(Array.isArray(gData) ? gData.slice(0, 3) : []);
        setUsers(Array.isArray(uData) ? uData.slice(0, 3) : []);
      } catch {
        setGames([]); setUsers([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  function handleKeyDown(e) {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'Enter' && query.trim()) {
      onClose();
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  }

  const hasGames   = games.length > 0;
  const hasUsers   = users.length > 0;
  const hasResults = hasGames || hasUsers;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div className="w-full max-w-2xl mx-4" onClick={(e) => e.stopPropagation()}>

        {/* Input */}
        <div className="flex items-center gap-3 h-14 px-5 rounded-xl bg-[#161616] border border-[#2A2A2A] shadow-2xl">
          <span className="text-[#71717A]"><IconSearch size={18} /></span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar juegos y usuarios..."
            className="flex-1 bg-transparent text-white text-base placeholder:text-[#3F3F46] outline-none caret-[#A855F7]"
          />
          {loading && (
            <svg className="animate-spin flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          )}
          <button onClick={onClose} className="text-[#71717A] hover:text-white transition-colors cursor-pointer flex-shrink-0">
            <IconX size={16} />
          </button>
        </div>

        {/* Dropdown */}
        {query.trim() && !loading && (
          <div className="mt-2 rounded-xl border border-[#1A1A1A] overflow-hidden shadow-2xl" style={{ backgroundColor: '#111111' }}>

            {!hasResults ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-[#71717A] text-sm">Sin resultados para &ldquo;{query}&rdquo;</p>
              </div>
            ) : (
              <>
                {/* ── Juegos section ── */}
                {hasGames && (
                  <div>
                    <p className="px-4 pt-3 pb-1 text-[#71717A] font-mono text-[10px] uppercase tracking-widest">
                      Juegos
                    </p>
                    {games.map((game) => (
                      <button
                        key={game.id}
                        onClick={() => { onClose(); router.push(`/game/${game.id}`); }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-[#1A1A1A] transition-colors cursor-pointer text-left min-h-[52px]"
                      >
                        <div className="relative w-7 h-10 rounded-md overflow-hidden bg-[#1A1A1A] flex-shrink-0">
                          {game.cover
                            ? <Image src={game.cover} alt={game.name} fill className="object-cover" sizes="28px" />
                            : <div className="w-full h-full bg-[#252525]" />
                          }
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                          <span className="text-white text-sm font-semibold leading-snug line-clamp-1">{game.name}</span>
                          <div className="flex items-center gap-1.5">
                            {game.genres?.[0] && <span className="text-[#71717A] font-mono text-[11px]">{game.genres[0]}</span>}
                            {game.genres?.[0] && game.year && <span className="text-[#71717A] text-xs">·</span>}
                            {game.year && <span className="text-[#71717A] font-mono text-[11px]">{game.year}</span>}
                          </div>
                        </div>
                        <span className="text-[#3F3F46] text-xs flex-shrink-0">→</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* ── Usuarios section ── */}
                {hasUsers && (
                  <div className={hasGames ? 'border-t border-[#1A1A1A]' : ''}>
                    <p className="px-4 pt-3 pb-1 text-[#71717A] font-mono text-[10px] uppercase tracking-widest">
                      Usuarios
                    </p>
                    {users.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => { onClose(); router.push(`/user/${user.username}`); }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-[#1A1A1A] transition-colors cursor-pointer text-left min-h-[52px]"
                      >
                        <Avatar user={user} size={32} />
                        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                          <span className="text-white text-sm font-semibold leading-snug line-clamp-1">
                            {user.nombre} {user.apellido}
                          </span>
                          <span className="text-[#71717A] font-mono text-[11px]">@{user.username}</span>
                        </div>
                        <span className="text-[#3F3F46] text-xs flex-shrink-0">→</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Footer: search all */}
            <button
              onClick={() => { onClose(); router.push(`/search?q=${encodeURIComponent(query.trim())}`); }}
              className="flex items-center gap-2 w-full px-4 py-3 border-t border-[#1A1A1A] hover:bg-[#1A1A1A] transition-colors cursor-pointer text-[#A855F7] text-sm min-h-[44px]"
            >
              <IconSearch size={14} />
              Ver todos los resultados para &ldquo;{query}&rdquo;
            </button>
          </div>
        )}

        <p className="text-[#3F3F46] text-xs text-center mt-3">Pulsa Esc para cerrar · Enter para buscar</p>
      </div>
    </div>
  );
}

// ── Navbar ─────────────────────────────────────────────────────────────────────

export default function Navbar() {
  const router   = useRouter();
  const pathname = usePathname();
  const [user,          setUser]          = useState(null);
  const [dropOpen,      setDropOpen]      = useState(false);
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [menuOpen,      setMenuOpen]      = useState(false);
  const [bellOpen,      setBellOpen]      = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [bellShakeKey,  setBellShakeKey]  = useState(0);
  const dropdownRef    = useRef(null);
  const menuRef        = useRef(null);
  const bellRef        = useRef(null);
  const prevUnreadRef  = useRef(0);

  // Re-check auth on every route change so switching accounts works
  useEffect(() => {
    async function checkAuth() {
      const token = localStorage.getItem('token');
      if (!token) { setUser(null); return; }
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          localStorage.removeItem('token');
          setUser(null);
          router.push('/login?expired=true');
          return;
        }
      } catch {
        localStorage.removeItem('token');
        setUser(null);
        return;
      }
      try {
        const r = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
        const data = r.ok ? await r.json() : null;
        setUser(data?.user ?? null);
      } catch {
        setUser(null);
      }
    }
    checkAuth();
  }, [pathname, router]);

  useEffect(() => {
    function handle(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropOpen(false);
      if (menuRef.current     && !menuRef.current.contains(e.target))     setMenuOpen(false);
      if (bellRef.current     && !bellRef.current.contains(e.target))     setBellOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // Shake bell when unread count increases (deferred to avoid setState-in-effect lint error)
  useEffect(() => {
    const unread = notifications.filter((n) => !n.read).length;
    if (unread > prevUnreadRef.current) {
      setTimeout(() => setBellShakeKey((k) => k + 1), 0);
    }
    prevUnreadRef.current = unread;
  }, [notifications]);

  // Restart notification polling whenever the logged-in user changes
  useEffect(() => {
    if (!user) {
      Promise.resolve().then(() => setNotifications([]));
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) return;
    function fetchNotifications() {
      fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => { if (Array.isArray(data)) setNotifications(data); })
        .catch(() => {});
    }
    fetchNotifications();
    const id = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(id);
  }, [user]);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') { setMenuOpen(false); setDropOpen(false); setBellOpen(false); setSearchOpen(false); }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  function handleLogout() {
    localStorage.removeItem('token');
    setUser(null);
    setDropOpen(false);
    setMenuOpen(false);
    router.push('/');
  }

  const NAV_LINKS = [
    { href: '/search', label: 'Explorar'  },
    { href: '/lists',  label: 'Listas'    },
    { href: '/feed',   label: 'Comunidad' },
  ];

  return (
    <>
      {searchOpen && <SearchBox onClose={() => setSearchOpen(false)} />}

      <nav
        className={`${inter.className} flex items-center justify-between h-16 px-4 md:px-10 border-b border-[#1A1A1A] relative z-40`}
        style={{ backgroundColor: '#161616' }}
      >
        {/* Left: logo + desktop nav */}
        <div className="flex items-center gap-6 h-full">
          <Link href="/">
            <Image src="/images/LOGO.png" alt="myRankee" width={160} height={39} quality={100} priority />
          </Link>
          <div className="hidden md:flex items-center gap-6 h-full">
            {NAV_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} className="text-[#71717A] text-sm hover:text-white transition-colors">
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1 md:gap-3">

          {/* Search icon */}
          <button
            onClick={() => setSearchOpen(true)}
            className="w-10 h-10 flex items-center justify-center text-[#71717A] hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-[#1A1A1A]"
            aria-label="Buscar"
          >
            <IconSearch size={18} />
          </button>

          {/* Bell notifications */}
          {user && (
            <div className="relative" ref={bellRef}>
              <button
                onClick={() => {
                  const opening = !bellOpen;
                  setBellOpen(opening);
                  if (opening) {
                    const token = localStorage.getItem('token');
                    if (token) {
                      fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } })
                        .then((r) => (r.ok ? r.json() : []))
                        .then((data) => { if (Array.isArray(data)) setNotifications(data); })
                        .catch(() => {});
                    }
                  }
                }}
                className="relative w-10 h-10 flex items-center justify-center text-[#71717A] hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-[#1A1A1A]"
                aria-label="Notificaciones"
              >
                <span key={bellShakeKey} className={bellShakeKey > 0 ? 'bell-shake inline-flex' : 'inline-flex'}>
                  <IconBell size={18} />
                </span>
                {(() => {
                  const unreadCount = notifications.filter((n) => !n.read).length;
                  if (unreadCount === 0) return null;
                  return (
                    <span
                      key={`badge-${bellShakeKey}`}
                      className="badge-pop absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-[#A855F7] flex items-center justify-center px-1"
                    >
                      <span className="text-white font-bold text-[10px] leading-none select-none">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    </span>
                  );
                })()}
              </button>

              {bellOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl border border-[#1A1A1A] overflow-hidden z-50 shadow-2xl" style={{ backgroundColor: '#111111' }}>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#1A1A1A]">
                    <p className="text-white text-sm font-semibold">Notificaciones</p>
                    {notifications.some((n) => !n.read) && (
                      <button
                        onClick={() => {
                          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                          const token = localStorage.getItem('token');
                          if (token) fetch('/api/notifications', { method: 'PUT', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
                        }}
                        className="text-[#A855F7] hover:text-white text-xs transition-colors cursor-pointer"
                      >
                        Marcar todas como leídas
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 gap-2">
                        <IconBell size={28} />
                        <p className="text-[#71717A] text-sm">Sin notificaciones</p>
                      </div>
                    ) : (
                      notifications.map((n) => {
                        const SYSTEM_TYPES = new Set(['warning', 'content_deleted', 'suspended', 'report_reviewed']);
                        const isSystem = SYSTEM_TYPES.has(n.type);

                        const href = n.type === 'follow'
                          ? `/user/${n.from_user?.username}`
                          : n.type === 'like' || n.type === 'comment'
                          ? `/game/${n.entity_id}`
                          : n.type === 'list_follow'
                          ? `/lists/${n.entity_id}`
                          : '#';

                        // User-generated notification text (prepended with sender name)
                        const userText = n.type === 'follow'
                          ? 'ha empezado a seguirte'
                          : n.type === 'like'
                          ? `le ha dado me gusta a tu reseña${n.entity_name ? ` de ${n.entity_name}` : ''}`
                          : n.type === 'comment'
                          ? `ha comentado en tu reseña${n.entity_name ? ` de ${n.entity_name}` : ''}`
                          : n.type === 'list_follow'
                          ? `ha seguido tu lista${n.entity_name ? ` "${n.entity_name}"` : ''}`
                          : null;

                        // System notification icon + accent color
                        const systemIcon = n.type === 'warning'
                          ? { color: '#F59E0B', path: <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></> }
                          : n.type === 'content_deleted'
                          ? { color: '#EF4444', path: <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></> }
                          : n.type === 'suspended'
                          ? { color: '#EF4444', path: <><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></> }
                          : n.type === 'report_reviewed'
                          ? { color: '#22C55E', path: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></> }
                          : null;

                        return (
                          <Link
                            key={n.id}
                            href={href}
                            onClick={() => {
                              if (!n.read) {
                                setNotifications((prev) => prev.map((m) => m.id === n.id ? { ...m, read: true } : m));
                                const token = localStorage.getItem('token');
                                if (token) fetch(`/api/notifications/${n.id}/read`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
                              }
                              setBellOpen(false);
                            }}
                            className={`flex items-start gap-3 px-4 py-3 transition-colors min-h-[56px] ${n.read ? 'hover:bg-[#1A1A1A]' : 'bg-[#17111f] hover:bg-[#1e1428]'}`}
                          >
                            {/* Avatar or system icon */}
                            {isSystem && systemIcon ? (
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                                style={{ backgroundColor: `${systemIcon.color}18`, border: `1px solid ${systemIcon.color}40` }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={systemIcon.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  {systemIcon.path}
                                </svg>
                              </div>
                            ) : (
                              <Avatar user={n.from_user ?? {}} size={32} className="mt-0.5" />
                            )}

                            <div className="flex-1 min-w-0">
                              {isSystem ? (
                                // System notifications: show entity_name as the full message
                                <p className="text-sm text-[#E0E0E0] leading-snug">
                                  {n.entity_name ?? 'Notificación del sistema'}
                                </p>
                              ) : (
                                <p className="text-sm text-[#E0E0E0] leading-snug">
                                  <span className="font-semibold text-white">{n.from_user?.nombre ?? 'Alguien'}</span>{' '}
                                  {userText ?? 'nueva notificación'}
                                </p>
                              )}
                              <p className="text-[#71717A] text-xs mt-0.5">
                                {new Date(n.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                              </p>
                            </div>
                            {!n.read && <span className="w-2 h-2 rounded-full bg-[#A855F7] flex-shrink-0 mt-2" />}
                          </Link>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Desktop: user dropdown or auth links */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropOpen((v) => !v)}
                  className="flex items-center gap-2.5 hover:opacity-80 transition-opacity cursor-pointer min-h-[44px] px-1"
                >
                  <Avatar user={user} size={32} />
                  <span className="text-white text-sm font-medium">{user.nombre}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#71717A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className={`transition-transform duration-200 ${dropOpen ? 'rotate-180' : ''}`}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {dropOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-[#1A1A1A] overflow-hidden z-50" style={{ backgroundColor: '#111111' }}>
                    <div className="px-4 py-3 border-b border-[#1A1A1A]">
                      <p className="text-white text-sm font-semibold">{user.nombre} {user.apellido}</p>
                      <p className="text-[#71717A] text-xs font-mono mt-0.5">@{user.username}</p>
                    </div>
                    <div className="py-1">
                      {[
                        { href: `/user/${user.username}`, label: 'Mi perfil',     icon: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></> },
                        { href: '/settings',              label: 'Configuración', icon: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></> },
                      ].map(({ href, label, icon }) => (
                        <Link key={href} href={href} onClick={() => setDropOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#A0A0A0] hover:text-white hover:bg-[#1A1A1A] transition-colors min-h-[44px]">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
                          {label}
                        </Link>
                      ))}
                      {user.is_admin && (
                        <Link href="/admin/reports" onClick={() => setDropOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[#1A1A1A] transition-colors min-h-[44px]"
                          style={{ color: '#F59E0B' }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                          </svg>
                          Admin
                        </Link>
                      )}
                    </div>
                    <div className="border-t border-[#1A1A1A] py-1">
                      <button onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-[#1A1A1A] transition-colors cursor-pointer min-h-[44px]">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                          <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                        Cerrar sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link href="/login" className="px-4 py-2 rounded-full text-white text-sm hover:bg-[#1A1A1A] transition-colors min-h-[44px] flex items-center">
                  Iniciar sesión
                </Link>
                <Link href="/register" className="px-4 py-2 rounded-full bg-[#A855F7] text-[#0A0A0A] text-sm font-semibold hover:bg-[#9333EA] transition-colors min-h-[44px] flex items-center">
                  Registrarse
                </Link>
              </>
            )}
          </div>

          {/* Mobile: hamburger */}
          <div className="md:hidden relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="w-11 h-11 flex items-center justify-center text-[#71717A] hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-[#1A1A1A]"
              aria-label="Menú"
            >
              {menuOpen ? <IconX size={20} /> : <IconMenu size={20} />}
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-[#1A1A1A] overflow-hidden z-50 shadow-2xl" style={{ backgroundColor: '#111111' }}>
                <div className="py-1">
                  {NAV_LINKS.map(({ href, label }) => (
                    <Link key={href} href={href} onClick={() => setMenuOpen(false)}
                      className="flex items-center px-4 py-3 text-sm text-[#A0A0A0] hover:text-white hover:bg-[#1A1A1A] transition-colors min-h-[44px]">
                      {label}
                    </Link>
                  ))}
                </div>

                {user ? (
                  <>
                    <div className="border-t border-[#1A1A1A] px-4 py-3">
                      <p className="text-white text-sm font-semibold">{user.nombre} {user.apellido}</p>
                      <p className="text-[#71717A] text-xs font-mono mt-0.5">@{user.username}</p>
                    </div>
                    <div className="border-t border-[#1A1A1A] py-1">
                      <Link href={`/user/${user.username}`} onClick={() => setMenuOpen(false)}
                        className="flex items-center px-4 py-3 text-sm text-[#A0A0A0] hover:text-white hover:bg-[#1A1A1A] transition-colors min-h-[44px]">
                        Mi perfil
                      </Link>
                      <Link href="/settings" onClick={() => setMenuOpen(false)}
                        className="flex items-center px-4 py-3 text-sm text-[#A0A0A0] hover:text-white hover:bg-[#1A1A1A] transition-colors min-h-[44px]">
                        Configuración
                      </Link>
                      {user.is_admin && (
                        <Link href="/admin/reports" onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-[#1A1A1A] transition-colors min-h-[44px]"
                          style={{ color: '#F59E0B' }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                          </svg>
                          Admin
                        </Link>
                      )}
                      <button onClick={handleLogout}
                        className="flex items-center w-full px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-[#1A1A1A] transition-colors cursor-pointer min-h-[44px]">
                        Cerrar sesión
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="border-t border-[#1A1A1A] py-1">
                    <Link href="/login" onClick={() => setMenuOpen(false)}
                      className="flex items-center px-4 py-3 text-sm text-[#A0A0A0] hover:text-white hover:bg-[#1A1A1A] transition-colors min-h-[44px]">
                      Iniciar sesión
                    </Link>
                    <Link href="/register" onClick={() => setMenuOpen(false)}
                      className="flex items-center px-4 py-3 text-sm text-[#A855F7] font-semibold hover:bg-[#1A1A1A] transition-colors min-h-[44px]">
                      Registrarse
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </nav>
    </>
  );
}
