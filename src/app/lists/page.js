'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Anton, Inter } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import Avatar from '@/app/components/Avatar';
import { useToast } from '@/app/components/ToastProvider';

const anton = Anton({ weight: '400', subsets: ['latin'], display: 'swap' });
const inter = Inter({ subsets: ['latin'], display: 'swap' });

const TABS = [
  { key: 'populares',   label: 'Populares' },
  { key: 'recientes',   label: 'Recientes' },
  { key: 'mas_seguidas', label: 'Más Seguidas' },
  { key: 'mis_listas',  label: 'Mis Listas',  authOnly: true },
  { key: 'siguiendo',   label: 'Siguiendo',   authOnly: true },
];

const TAB_SLUGS = {
  populares:    'populares',
  recientes:    'recientes',
  mas_seguidas: 'mas-seguidas',
  mis_listas:   'mis-listas',
  siguiendo:    'siguiendo',
};
const SLUG_TO_KEY = Object.fromEntries(Object.entries(TAB_SLUGS).map(([k, v]) => [v, k]));

const CATEGORIES = [
  'RPG', 'Acción/Aventura', 'Terror', 'Indie',
  'Multijugador', 'Soulslike', 'Plataformas', 'Estrategia',
];

// ── Cover collage ─────────────────────────────────────────────────────────────

function CoverCollage({ covers }) {
  return (
    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="relative overflow-hidden bg-[#141414]" style={{ minWidth: 0, minHeight: 0 }}>
          {covers[i] && (
            <Image src={covers[i]} alt="" fill className="object-cover" sizes="50vw" style={{ objectFit: 'cover' }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── List card ─────────────────────────────────────────────────────────────────

function ListCard({ list, tall }) {
  return (
    <Link
      href={`/lists/${list.id}`}
      className={`relative rounded-xl overflow-hidden block hover:scale-[1.02] transition-all duration-200 border border-transparent hover:border-[#A855F7] ${tall ? 'h-48 sm:h-64' : 'h-48'}`}
    >
      <CoverCollage covers={list.covers} />

      {/* Gradient */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 40%, rgba(0,0,0,0.3) 100%)' }}
      />

      {/* Content */}
      <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col gap-2">
        <div>
          <h3 className="text-white font-bold text-sm leading-snug line-clamp-2">{list.title}</h3>
          {list.description && (
            <p className="text-[#71717A] text-xs mt-1 line-clamp-2 leading-relaxed">{list.description}</p>
          )}
        </div>

        <div className="flex items-center justify-between mt-1">
          {/* Creator */}
          {list.creator && (
            <div className="flex items-center gap-1.5">
              <Avatar user={list.creator} size={20} />
              <span className="text-[#71717A] text-[11px]">@{list.creator.username}</span>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-3 text-[#71717A] text-[11px] font-mono">
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
      </div>
    </Link>
  );
}

// ── Create list modal ─────────────────────────────────────────────────────────

function CreateListModal({ onClose, onCreated }) {
  const { addToast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!title.trim()) { setError('El título es obligatorio'); return; }
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), is_public: isPublic }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al crear la lista'); return; }
      addToast('¡Lista creada!');
      onCreated(data);
    } catch {
      setError('Error al crear la lista');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-[#1A1A1A] flex flex-col gap-6 p-6" style={{ backgroundColor: '#111111' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className={`${anton.className} text-white text-2xl`}>Crear Lista</h2>
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
              placeholder="Nombre de la lista"
              className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg px-4 py-3 text-white text-sm placeholder:text-[#71717A] focus:outline-none focus:border-[#A855F7] transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[#71717A] text-sm">
              Descripción <span className="font-mono text-xs">(opcional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="¿De qué trata esta lista?"
              rows={3}
              className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg px-4 py-3 text-white text-sm placeholder:text-[#71717A] focus:outline-none focus:border-[#A855F7] transition-colors resize-none"
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 accent-[#A855F7]"
            />
            <span className="text-white text-sm">Lista pública</span>
          </label>
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
            onClick={handleCreate}
            disabled={loading}
            className="flex-1 py-2.5 rounded-full bg-[#A855F7] text-[#0A0A0A] text-sm font-semibold hover:bg-[#9333EA] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {loading ? 'Creando...' : 'Crear Lista'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ListsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState(null);
  const [userLoaded, setUserLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    const slug = searchParams.get('tab') || 'populares';
    return SLUG_TO_KEY[slug] || 'populares';
  });
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [createModal, setCreateModal] = useState(false);

  // Load user on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setUserLoaded(true); return; }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
        setUserLoaded(true);
      })
      .catch(() => setUserLoaded(true));
  }, []);

  async function fetchLists(tab, pageNum, append) {
    setLoading(true);
    try {
      if (tab === 'mis_listas') {
        const token = localStorage.getItem('token');
        const meRes = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
        if (!meRes.ok) { setLoading(false); return; }
        const { user: u } = await meRes.json();
        const res = await fetch(`/api/users/${u.username}/lists`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = res.ok ? await res.json() : [];
        setLists(append ? (prev) => [...prev, ...data] : data);
        setHasMore(false);
      } else if (tab === 'siguiendo') {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/lists/following', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = res.ok ? await res.json() : [];
        setLists(append ? (prev) => [...prev, ...(Array.isArray(data) ? data : [])] : (Array.isArray(data) ? data : []));
        setHasMore(false);
      } else {
        const res = await fetch(`/api/lists?tab=${tab}&page=${pageNum}`);
        const data = res.ok ? await res.json() : { lists: [], hasMore: false };
        setLists(append ? (prev) => [...prev, ...(data.lists || [])] : (data.lists || []));
        setHasMore(data.hasMore || false);
      }
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }

  // Load lists when tab or userLoaded changes
  useEffect(() => {
    if (!userLoaded) return;
    if ((activeTab === 'mis_listas' || activeTab === 'siguiendo') && !user) {
      router.push('/login');
      return;
    }
    setPage(1);
    setLists([]);
    fetchLists(activeTab, 1, false);
  }, [activeTab, userLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleTabChange(tab) {
    const tabDef = TABS.find((t) => t.key === tab);
    if (tabDef?.authOnly && userLoaded && !user) {
      router.push('/login');
      return;
    }
    setActiveTab(tab);
    router.replace(`/lists?tab=${TAB_SLUGS[tab]}`, { scroll: false });
  }

  function handleLoadMore() {
    const next = page + 1;
    setPage(next);
    fetchLists(activeTab, next, true);
  }

  function handleCreated(newList) {
    setCreateModal(false);
    router.push(`/lists/${newList.id}`);
  }

  return (
    <div className={`${inter.className} min-h-screen bg-[#0A0A0A] w-full`}>
      <Navbar />

      <div className="max-w-7xl mx-auto px-8 py-12">

        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <h1 className={`${anton.className} text-white text-[44px] leading-none`}>
              Listas de Videojuegos
            </h1>
            <p className="text-[#71717A] text-sm mt-2">
              Descubre y sigue colecciones curadas por la comunidad
            </p>
          </div>
          {user && (
            <button
              onClick={() => setCreateModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#A855F7] text-[#0A0A0A] text-sm font-semibold hover:bg-[#9333EA] transition-colors cursor-pointer flex-shrink-0 mt-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Crear Lista
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0 mb-8 border-b border-[#1A1A1A]">
          {TABS.filter((tab) => !tab.authOnly || user).map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-5 py-3 text-sm font-medium transition-colors cursor-pointer border-b-2 -mb-px ${
                activeTab === tab.key
                  ? 'border-[#A855F7] text-[#A855F7]'
                  : 'border-transparent text-[#71717A] hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Lists grid */}
        {loading && lists.length === 0 ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 rounded-full border-2 border-[#A855F7] border-t-transparent animate-spin" />
          </div>
        ) : lists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#3F3F46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            <div className="flex flex-col gap-1">
              <p className="text-white text-sm font-medium">
                {activeTab === 'mis_listas'
                  ? 'Todavía no has creado ninguna lista'
                  : activeTab === 'siguiendo'
                  ? 'Aún no sigues ninguna lista'
                  : 'No hay listas disponibles'}
              </p>
              <p className="text-[#71717A] text-sm max-w-xs mx-auto">
                {activeTab === 'mis_listas'
                  ? '¡Crea tu primera colección de videojuegos!'
                  : activeTab === 'siguiendo'
                  ? 'Explora listas de la comunidad y síguelas para guardarlas aquí.'
                  : 'Vuelve más tarde o crea una nueva lista'}
              </p>
            </div>
            {user && activeTab === 'mis_listas' && (
              <button
                onClick={() => setCreateModal(true)}
                className="px-5 py-2.5 rounded-full bg-[#A855F7] text-[#0A0A0A] text-sm font-semibold hover:bg-[#9333EA] transition-colors cursor-pointer min-h-[44px]"
              >
                Crear mi primera lista
              </button>
            )}
            {activeTab === 'siguiendo' && (
              <button
                onClick={() => handleTabChange('populares')}
                className="px-5 py-2.5 rounded-full border border-[#A855F7] text-[#A855F7] text-sm font-medium hover:bg-[#A855F7]/10 transition-colors cursor-pointer min-h-[44px]"
              >
                Explorar listas populares
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Alternating 3-wide / 2-tall grid using 6 columns (single column on mobile) */}
            <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
              {lists.map((list, i) => {
                const tall = i % 5 >= 3;
                return (
                  <div key={list.id} className={tall ? 'col-span-1 sm:col-span-3' : 'col-span-1 sm:col-span-2'}>
                    <ListCard list={list} tall={tall} />
                  </div>
                );
              })}
            </div>

            {/* Load more */}
            {hasMore && !loading && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={handleLoadMore}
                  className="px-8 py-3 rounded-full border border-[#1A1A1A] text-white text-sm hover:bg-[#1A1A1A] transition-colors cursor-pointer"
                >
                  Cargar más listas
                </button>
              </div>
            )}
            {loading && (
              <div className="flex justify-center mt-8">
                <div className="w-6 h-6 rounded-full border-2 border-[#A855F7] border-t-transparent animate-spin" />
              </div>
            )}
          </>
        )}

        {/* Popular categories */}
        <div className="mt-16 pt-12 border-t border-[#1A1A1A]">
          <h2 className={`${anton.className} text-white text-2xl mb-6`}>Categorías Populares</h2>
          <div className="flex flex-wrap gap-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className="px-5 py-2.5 rounded-full border border-[#1A1A1A] text-[#71717A] text-sm hover:text-white hover:border-[#A855F7] transition-colors cursor-pointer"
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {createModal && (
        <CreateListModal
          onClose={() => setCreateModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
