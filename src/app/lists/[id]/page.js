'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Anton, Inter } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import Avatar from '@/app/components/Avatar';

const anton = Anton({ weight: '400', subsets: ['latin'], display: 'swap' });
const inter = Inter({ subsets: ['latin'], display: 'swap' });

// ── Add game modal ────────────────────────────────────────────────────────────

function AddGameModal({ listId, onClose, onAdded, onRemoved, initialAddedIds = [] }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState('');
  const [addedIds, setAddedIds] = useState(() => new Set(initialAddedIds));
  const [hoveredId, setHoveredId] = useState(null);

  async function handleSearch(q) {
    setQuery(q);
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/games/search?q=${encodeURIComponent(q)}`);
      const data = res.ok ? await res.json() : [];
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function handleAdd(game) {
    const token = localStorage.getItem('token');
    setLoading(game.id);
    setError('');
    try {
      const res = await fetch(`/api/lists/${listId}/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ igdb_game_id: game.id }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al añadir el juego'); return; }
      setAddedIds((prev) => new Set([...prev, game.id]));
      onAdded({ igdb_game_id: game.id, name: game.name, cover: game.cover });
    } catch {
      setError('Error al añadir el juego');
    } finally {
      setLoading(null);
    }
  }

  async function handleRemove(game) {
    const token = localStorage.getItem('token');
    setLoading(game.id);
    try {
      const res = await fetch(`/api/lists/${listId}/games`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ igdb_game_id: game.id }),
      });
      if (!res.ok) return;
      setAddedIds((prev) => { const next = new Set(prev); next.delete(game.id); return next; });
      setHoveredId(null);
      onRemoved(game.id);
    } catch {
      // fail silently
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
      <div className="modal-scale-in w-full max-w-lg rounded-2xl border border-[#1A1A1A] flex flex-col gap-4 p-6" style={{ backgroundColor: '#111111' }}>
        <div className="flex items-center justify-between">
          <h2 className={`${anton.className} text-white text-2xl`}>Añadir juego</h2>
          <button onClick={onClose} className="text-[#71717A] hover:text-white transition-colors cursor-pointer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar juego..."
            className="w-full bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg pl-10 pr-4 py-3 text-white text-sm placeholder:text-[#71717A] focus:outline-none focus:border-[#A855F7] transition-colors"
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-[#A855F7] border-t-transparent animate-spin" />
          )}
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
          {results.map((game) => {
            const isAdded = addedIds.has(game.id);
            const isHovered = hoveredId === game.id;
            const isLoading = loading === game.id;
            return (
              <div
                key={game.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-[#1A1A1A] hover:border-[#A855F7] transition-colors"
              >
                <div className="relative w-10 h-14 rounded overflow-hidden bg-[#141414] flex-shrink-0">
                  {game.cover && (
                    <Image src={game.cover} alt={game.name} fill className="object-cover" sizes="40px" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{game.name}</p>
                  {game.year && <p className="text-[#71717A] text-xs font-mono">{game.year}</p>}
                </div>
                {isLoading ? (
                  <button disabled className="flex-shrink-0 px-3 py-1.5 rounded-full border border-[#3A3A3A] text-[#71717A] text-xs font-semibold opacity-50 cursor-not-allowed w-[72px] text-center">
                    ...
                  </button>
                ) : isAdded ? (
                  <button
                    onClick={() => handleRemove(game)}
                    onMouseEnter={() => setHoveredId(game.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer w-[72px] text-center ${
                      isHovered
                        ? 'border border-[#EF4444] text-[#EF4444] bg-[#EF4444]/10'
                        : 'border border-[#3A3A3A] text-[#71717A]'
                    }`}
                  >
                    {isHovered ? 'Quitar' : 'Añadido'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleAdd(game)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full bg-[#A855F7] text-[#0A0A0A] text-xs font-semibold hover:bg-[#9333EA] transition-colors cursor-pointer w-[72px] text-center"
                  >
                    Añadir
                  </button>
                )}
              </div>
            );
          })}
          {query && !searching && results.length === 0 && (
            <p className="text-[#71717A] text-sm text-center py-6">No se encontraron juegos.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Edit list modal ───────────────────────────────────────────────────────────

function EditListModal({ list, onClose, onSaved }) {
  const [title, setTitle] = useState(list.title);
  const [description, setDescription] = useState(list.description || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!title.trim()) { setError('El título es obligatorio'); return; }
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/lists/${list.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: title.trim(), description: description.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al guardar'); return; }
      onSaved({ title: data.title, description: data.description });
    } catch {
      setError('Error al guardar los cambios');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
      <div className="modal-scale-in w-full max-w-md rounded-2xl border border-[#1A1A1A] flex flex-col gap-6 p-6" style={{ backgroundColor: '#111111' }}>
        <div className="flex items-center justify-between">
          <h2 className={`${anton.className} text-white text-2xl`}>Editar lista</h2>
          <button onClick={onClose} className="text-[#71717A] hover:text-white transition-colors cursor-pointer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[#71717A] text-sm">Título</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#A855F7] transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[#71717A] text-sm">Descripción <span className="font-mono text-xs">(opcional)</span></label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#A855F7] transition-colors resize-none"
            />
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-full border border-[#1A1A1A] text-[#71717A] text-sm hover:text-white hover:border-[#71717A] transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-2.5 rounded-full bg-[#A855F7] text-[#0A0A0A] text-sm font-semibold hover:bg-[#9333EA] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ListDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();

  const [list, setList] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [addGameOpen, setAddGameOpen] = useState(false);
  const [editListOpen, setEditListOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [shareListCopied, setShareListCopied] = useState(false);

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [listRes, meRes] = await Promise.all([
        fetch(`/api/lists/${id}`, { headers }),
        token ? fetch('/api/auth/me', { headers }) : Promise.resolve(null),
      ]);

      if (listRes.ok) {
        const data = await listRes.json();
        setList(data);
        setFollowing(data.is_following);
      }

      if (meRes?.ok) {
        const meData = await meRes.json();
        if (meData?.user) setCurrentUser(meData.user);
      }

      setLoading(false);
    }
    load();
  }, [id]);

  const isOwner = currentUser && list && currentUser.id === list.user_id;

  async function handleFollow() {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    setFollowLoading(true);
    try {
      const res = await fetch(`/api/lists/${id}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setFollowing(data.following);
        setList((prev) => ({
          ...prev,
          followers_count: prev.followers_count + (data.following ? 1 : -1),
        }));
      }
    } catch {
      // fail silently
    } finally {
      setFollowLoading(false);
    }
  }

  async function handleRemoveGame(igdb_game_id) {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/lists/${id}/games`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ igdb_game_id }),
      });
      if (res.ok) {
        setList((prev) => ({
          ...prev,
          games: prev.games.filter((g) => g.igdb_game_id !== igdb_game_id),
          games_count: prev.games_count - 1,
        }));
      }
    } catch {
      // fail silently
    }
  }

  async function handleDeleteList() {
    const token = localStorage.getItem('token');
    setDeleting(true);
    try {
      const res = await fetch(`/api/lists/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) router.push('/lists');
    } catch {
      // fail silently
    } finally {
      setDeleting(false);
    }
  }

  function handleGameAdded(game) {
    setList((prev) => ({
      ...prev,
      games: [...prev.games, game],
      games_count: prev.games_count + 1,
    }));
  }

  function handleGameRemoved(igdbId) {
    setList((prev) => ({
      ...prev,
      games: prev.games.filter((g) => g.igdb_game_id !== igdbId),
      games_count: prev.games_count - 1,
    }));
  }

  function handleListSaved({ title, description }) {
    setList((prev) => ({ ...prev, title, description }));
    setEditListOpen(false);
  }

  if (loading) {
    return (
      <div className={`${inter.className} min-h-screen bg-[#0A0A0A] w-full`}>
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 rounded-full border-2 border-[#A855F7] border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className={`${inter.className} min-h-screen bg-[#0A0A0A] w-full`}>
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <p className="text-[#71717A] text-sm">Lista no encontrada.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${inter.className} min-h-screen bg-[#0A0A0A] w-full`}>
      <Navbar />

      <div className="max-w-6xl mx-auto px-8 py-10">

        {/* Breadcrumb */}
        <Link href="/lists" className="inline-flex items-center gap-2 text-[#71717A] text-sm hover:text-white transition-colors mb-8">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Volver a listas
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between gap-6 mb-8">
          <div className="flex-1 min-w-0">
            <h1 className={`${anton.className} text-white text-[38px] leading-tight mb-2`}>{list.title}</h1>
            {list.description && (
              <p className="text-[#71717A] text-sm leading-relaxed mb-5">{list.description}</p>
            )}

            {/* Creator */}
            <div className="flex items-center gap-3 mb-5">
              <Avatar user={list.creator} size={32} />
              <div>
                <Link
                  href={`/user/${list.creator.username}`}
                  className="text-white text-sm font-medium hover:text-[#A855F7] transition-colors"
                >
                  {list.creator.nombre}
                </Link>
                <p className="text-[#71717A] text-xs font-mono">@{list.creator.username}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 text-[#71717A] font-mono text-sm">
              <span>
                <span className="text-white font-semibold">{list.games_count}</span>{' '}
                {list.games_count === 1 ? 'juego' : 'juegos'}
              </span>
              <span>
                <span className="text-white font-semibold">{list.followers_count}</span>{' '}
                {list.followers_count === 1 ? 'seguidor' : 'seguidores'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 flex-shrink-0 mt-2">
            {!isOwner && (
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                  following
                    ? 'border border-[#A855F7] text-[#A855F7] hover:bg-[#A855F7]/10'
                    : 'bg-[#A855F7] text-[#0A0A0A] hover:bg-[#9333EA]'
                }`}
              >
                {following ? (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Siguiendo
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Seguir lista
                  </>
                )}
              </button>
            )}

            <button
              onClick={async () => {
                const url = `https://myrankee.com/lists/${id}`;
                try { await navigator.clipboard.writeText(url); } catch {}
                setShareListCopied(true);
                setTimeout(() => setShareListCopied(false), 2000);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#1A1A1A] text-white text-sm hover:bg-[#1A1A1A] transition-colors cursor-pointer"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              {shareListCopied ? '¡Copiado!' : 'Compartir'}
            </button>

            {isOwner && (
              <>
                <button
                  onClick={() => setAddGameOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#A855F7] text-[#0A0A0A] text-sm font-semibold hover:bg-[#9333EA] transition-colors cursor-pointer"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Añadir juego
                </button>
                <button
                  onClick={() => setEditListOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#1A1A1A] text-white text-sm hover:bg-[#1A1A1A] transition-colors cursor-pointer"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Editar lista
                </button>
                {!deleteConfirm ? (
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#1A1A1A] text-red-400 text-sm hover:bg-[#1A1A1A] transition-colors cursor-pointer"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6" /><path d="M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                    Eliminar lista
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDeleteConfirm(false)}
                      className="flex-1 py-2 rounded-full border border-[#1A1A1A] text-[#71717A] text-xs hover:text-white transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleDeleteList}
                      disabled={deleting}
                      className="flex-1 py-2 rounded-full bg-red-500 text-white text-xs font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {deleting ? '...' : 'Confirmar'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-[#1A1A1A] mb-8" />

        {/* Games grid */}
        {list.games.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p className="text-[#71717A] text-sm">Esta lista no tiene juegos todavía.</p>
            {isOwner && (
              <button
                onClick={() => setAddGameOpen(true)}
                className="px-5 py-2.5 rounded-full bg-[#A855F7] text-[#0A0A0A] text-sm font-semibold hover:bg-[#9333EA] transition-colors cursor-pointer"
              >
                Añadir el primer juego
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {list.games.map((game) => (
              <div key={game.igdb_game_id} className="group relative flex flex-col gap-2">
                <Link href={`/game/${game.igdb_game_id}`} className="block">
                  <div className="relative rounded-lg overflow-hidden bg-[#141414] aspect-[3/4]">
                    {game.cover ? (
                      <Image src={game.cover} alt={game.name} fill className="object-cover group-hover:scale-105 transition-transform" sizes="200px" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[#71717A] text-xs">Sin imagen</span>
                      </div>
                    )}
                    {/* Remove button overlay for owner */}
                    {isOwner && (
                      <button
                        onClick={(e) => { e.preventDefault(); handleRemoveGame(game.igdb_game_id); }}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 cursor-pointer"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </div>
                </Link>
                <div className="flex flex-col gap-0.5">
                  <Link href={`/game/${game.igdb_game_id}`} className="text-white text-xs font-medium leading-snug line-clamp-2 hover:text-[#A855F7] transition-colors">
                    {game.name}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {addGameOpen && (
        <AddGameModal
          listId={id}
          onClose={() => setAddGameOpen(false)}
          onAdded={handleGameAdded}
          onRemoved={handleGameRemoved}
          initialAddedIds={list.games.map((g) => g.igdb_game_id)}
        />
      )}

      {editListOpen && (
        <EditListModal
          list={list}
          onClose={() => setEditListOpen(false)}
          onSaved={handleListSaved}
        />
      )}
    </div>
  );
}
