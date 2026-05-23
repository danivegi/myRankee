'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Anton, Inter } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';
import { useToast } from './ToastProvider';
import ReviewCommentsSection from './ReviewCommentsSection';
import ShareModal from './ShareModal';
import ReportModal from './ReportModal';

function fireAchievementToasts(newAchievements, addAchievementToast) {
  if (!Array.isArray(newAchievements)) return;
  newAchievements.forEach((a, i) => {
    setTimeout(() => addAchievementToast({ title: a.title, tier: a.tier, code: a.key }), i * 600);
  });
}

const anton = Anton({ weight: '400', subsets: ['latin'], display: 'swap' });
const inter = Inter({ subsets: ['latin'], display: 'swap' });

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconStar({ size = 16, fill = 'none', color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function IconStarHalf({ size = 16, color = '#A855F7' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 17.8 5.8 21 7 14.1 2 9.3l7-.8L12 2" fill={color} />
      <path d="M12 2v15.8" />
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

function IconMessage({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
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

function IconHeart({ size = 14, color = 'currentColor', filled = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function IconCheck({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ── Star display (read-only) ──────────────────────────────────────────────────

function StarRating({ value, size = 16 }) {
  if (!value) {
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <IconStar key={i} size={size} fill="none" color="#71717A" />
        ))}
      </div>
    );
  }
  const full  = Math.floor(value);
  const half  = value % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: full  }).map((_, i) => <IconStar     key={`f${i}`} size={size} fill="#A855F7" color="#A855F7" />)}
      {half &&                                       <IconStarHalf              size={size} color="#A855F7" />}
      {Array.from({ length: empty }).map((_, i) => <IconStar     key={`e${i}`} size={size} fill="none"    color="#71717A" />)}
    </div>
  );
}

// ── Interactive star picker ───────────────────────────────────────────────────

function StarPicker({ value, onChange }) {
  const [hover,       setHover]       = useState(null);
  const [poppedStar,  setPoppedStar]  = useState(null);
  const display = hover ?? value;

  function handleMouseMove(e, star) {
    const rect = e.currentTarget.getBoundingClientRect();
    const half = e.clientX - rect.left < rect.width / 2;
    setHover(half ? star - 0.5 : star);
  }

  function handleClick(e, star) {
    const rect = e.currentTarget.getBoundingClientRect();
    const half = e.clientX - rect.left < rect.width / 2;
    const val = half ? star - 0.5 : star;
    onChange(val);
    setPoppedStar(val);
    setTimeout(() => setPoppedStar(null), 300);
  }

  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled   = display >= star;
        const halfFill = !filled && display >= star - 0.5;
        const isPopped = poppedStar !== null && (
          poppedStar >= star || (poppedStar >= star - 0.5 && poppedStar < star)
        );
        return (
          <div
            key={star}
            className={`cursor-pointer select-none${isPopped ? ' star-pop' : ''}`}
            style={{ transition: 'color 120ms ease-out' }}
            onMouseMove={(e) => handleMouseMove(e, star)}
            onClick={(e) => handleClick(e, star)}
          >
            {filled   ? <IconStar size={32} fill="#A855F7" color="#A855F7" /> :
             halfFill ? <IconStarHalf size={32} color="#A855F7" /> :
                        <IconStar size={32} fill="none" color="#3F3F46" />}
          </div>
        );
      })}
      <span className="text-[#A855F7] font-mono text-sm w-8 text-center ml-1">
        {display > 0 ? display : ''}
      </span>
    </div>
  );
}

// ── Add to list modal ─────────────────────────────────────────────────────────

function AddToListModal({ gameId, onClose }) {
  const { addToast } = useToast();
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(null);
  const [added, setAdded] = useState(new Set());
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem('token');
      try {
        const meRes = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
        if (!meRes.ok) { setLoading(false); return; }
        const { user } = await meRes.json();
        const listsRes = await fetch(`/api/users/${user.username}/lists`);
        if (listsRes.ok) setLists(await listsRes.json());
      } catch {
        // fail silently
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleAdd(listId) {
    const token = localStorage.getItem('token');
    setAdding(listId);
    setError('');
    try {
      const res = await fetch(`/api/lists/${listId}/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ igdb_game_id: gameId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al añadir'); addToast(data.error || 'Error al añadir el juego', 'error'); return; }
      setAdded((prev) => new Set(prev).add(listId));
      addToast('¡Juego añadido a tu lista!');
    } catch {
      setError('Error al añadir el juego');
      addToast('Error al añadir el juego', 'error');
    } finally {
      setAdding(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
      <div className="modal-scale-in w-full max-w-sm rounded-2xl border border-[#1A1A1A] flex flex-col gap-4 p-6" style={{ backgroundColor: '#111111' }}>
        <div className="flex items-center justify-between">
          <h2 className={`${anton.className} text-white text-2xl`}>Añadir a lista</h2>
          <button onClick={onClose} className="text-[#71717A] hover:text-white transition-colors cursor-pointer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 rounded-full border-2 border-[#A855F7] border-t-transparent animate-spin" />
          </div>
        ) : lists.length === 0 ? (
          <div className="py-6 text-center flex flex-col gap-3">
            <p className="text-[#71717A] text-sm">No tienes listas todavía.</p>
            <Link href="/lists" onClick={onClose} className="text-[#A855F7] text-sm hover:underline">
              Crear una lista
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
            {lists.map((list) => {
              const isAdded = added.has(list.id);
              const isAdding = adding === list.id;
              return (
                <button
                  key={list.id}
                  onClick={() => !isAdded && handleAdd(list.id)}
                  disabled={isAdded || isAdding}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg border text-left text-sm transition-colors cursor-pointer disabled:cursor-default ${
                    isAdded
                      ? 'border-[#A855F7] bg-[#A855F7]/10 text-[#A855F7]'
                      : 'border-[#1A1A1A] text-white hover:bg-[#1A1A1A]'
                  }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{list.title}</span>
                    <span className="text-[#71717A] text-xs">{list.games_count} juegos</span>
                  </div>
                  {isAdding ? (
                    <div className="w-4 h-4 rounded-full border-2 border-[#A855F7] border-t-transparent animate-spin" />
                  ) : isAdded ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#71717A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="pt-2 border-t border-[#1A1A1A]">
          <Link
            href="/lists"
            onClick={onClose}
            className="text-[#71717A] text-xs hover:text-white transition-colors"
          >
            + Crear nueva lista
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Rating modal ──────────────────────────────────────────────────────────────

function RatingModal({ gameId, onClose, onSubmit }) {
  const { addToast, addAchievementToast } = useToast();
  const [score, setScore]     = useState(0);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function handleSubmit() {
    if (score === 0) { setError('Selecciona una puntuación para continuar'); return; }
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    try {
      const ratingRes = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ igdb_game_id: gameId, score }),
      });
      addToast('¡Juego puntuado correctamente!');
      const ratingData = ratingRes.ok ? await ratingRes.json() : null;
      fireAchievementToasts(ratingData?.new_achievements, addAchievementToast);

      if (content.trim()) {
        const reviewRes = await fetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ igdb_game_id: gameId, content: content.trim() }),
        });
        addToast('¡Reseña publicada!');
        const reviewData = reviewRes.ok ? await reviewRes.json() : null;
        fireAchievementToasts(reviewData?.new_achievements, addAchievementToast);
      }
      onSubmit();
      onClose();
    } catch {
      setError('Error al guardar. Inténtalo de nuevo.');
      addToast('Error al guardar. Inténtalo de nuevo.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
      <div className="modal-scale-in w-full max-w-md rounded-2xl border border-[#1A1A1A] flex flex-col gap-6 p-6" style={{ backgroundColor: '#111111' }}>

        <div className="flex items-center justify-between">
          <h2 className={`${anton.className} text-white text-2xl`}>Puntuar juego</h2>
          <button onClick={onClose} className="text-[#71717A] hover:text-white transition-colors cursor-pointer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[#71717A] text-sm">Tu puntuación</span>
          <StarPicker value={score} onChange={setScore} />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[#71717A] text-sm">Reseña <span className="text-[#71717A] font-mono text-xs">(opcional)</span></span>
          </div>
          <textarea
            value={content}
            onChange={(e) => { setContent(e.target.value); if (error && error.includes('reseña')) setError(''); }}
            placeholder="¿Qué te ha parecido el juego?"
            rows={4}
            className={`bg-[#0A0A0A] border rounded-lg px-4 py-3 text-white text-sm placeholder:text-[#71717A] focus:outline-none transition-colors resize-none ${
              error && error.includes('reseña') ? 'border-red-500 focus:border-red-400' : 'border-[#1A1A1A] focus:border-[#A855F7]'
            }`}
          />
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
            onClick={handleSubmit}
            disabled={loading || score === 0}
            className="flex-1 py-2.5 rounded-full bg-[#A855F7] text-[#0A0A0A] text-sm font-semibold hover:bg-[#9333EA] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const BACKLOG_OPTIONS = [
  { status: 'jugado',    label: 'Jugado',    icon: <IconCheck size={15} color="currentColor" /> },
  { status: 'jugando',   label: 'Jugando',   icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> },
  { status: 'pendiente', label: 'Pendiente', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
];

const BACKLOG_TOAST = {
  jugado:    'Marcado como "Jugado" ✓',
  jugando:   'Marcado como "Jugando" ✓',
  pendiente: 'Añadido a "Pendiente" ✓',
};

export default function GameInteractions({ gameId, gameData }) {
  const router = useRouter();

  const { addToast, addAchievementToast } = useToast();
  const [stats, setStats]                 = useState(null);
  const [reviews, setReviews]             = useState([]);
  const [backlogStatus, setBacklog]       = useState(null);
  const [modalOpen, setModalOpen]         = useState(false);
  const [listModalOpen, setListModal]     = useState(false);
  const [backlogLoading, setBacklogL]     = useState(false);
  const [currentUsername, setCurrentUsername] = useState(null);
  const [expandedReviews, setExpandedReviews] = useState(new Set());
  const [commentCounts, setCommentCounts]     = useState({});
  const [shareTarget,   setShareTarget]       = useState(null);
  const [reportTarget,  setReportTarget]      = useState(null); // { type, id }
  const [likedMap,      setLikedMap]          = useState({});
  const [likesMap,      setLikesMap]          = useState({});
  const [heartAnimMap,  setHeartAnimMap]      = useState({});
  const [likingMap,     setLikingMap]         = useState({});
  const [favorited,     setFavorited]         = useState(false);
  const [favLoading,    setFavLoading]        = useState(false);
  const [favAnim,       setFavAnim]           = useState(false);

  async function loadStats() {
    const res = await fetch(`/api/games/${gameId}/stats`);
    if (res.ok) setStats(await res.json());
  }

  async function loadReviews() {
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(`/api/reviews?igdb_game_id=${gameId}`, { headers });
    if (res.ok) {
      const data = await res.json();
      setReviews(data);
      const counts = {};
      const liked  = {};
      const likes  = {};
      data.forEach((r) => {
        counts[r.id] = r.comments_count ?? 0;
        liked[r.id]  = r.viewer_liked   ?? false;
        likes[r.id]  = r.likes_count    ?? 0;
      });
      setCommentCounts(counts);
      setLikedMap(liked);
      setLikesMap(likes);
    }
  }

  async function loadBacklog() {
    const token = localStorage.getItem('token');
    if (!token) return;
    const res = await fetch('/api/backlog', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      const entry = data.find((e) => String(e.igdb_game_id) === String(gameId));
      setBacklog(entry?.status ?? null);
    }
  }

  async function loadFavorite() {
    const token = localStorage.getItem('token');
    if (!token) return;
    const res = await fetch(`/api/favorites/check/${gameId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setFavorited(data.favorited);
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setCurrentUsername(d?.user?.username ?? null))
        .catch(() => {});
    }
    void (async () => {
      await loadStats();
      await loadReviews();
      await loadBacklog();
      await loadFavorite();
    })();
  }, [gameId]);

  function toggleComments(reviewId) {
    setExpandedReviews((prev) => {
      const next = new Set(prev);
      if (next.has(reviewId)) next.delete(reviewId);
      else next.add(reviewId);
      return next;
    });
  }

  async function handleReviewLike(reviewId) {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    if (likingMap[reviewId]) return;
    setLikingMap((prev) => ({ ...prev, [reviewId]: true }));
    const newLiked = !likedMap[reviewId];
    setLikedMap((prev) => ({ ...prev, [reviewId]: newLiked }));
    setLikesMap((prev) => ({ ...prev, [reviewId]: (prev[reviewId] ?? 0) + (newLiked ? 1 : -1) }));
    setHeartAnimMap((prev) => ({ ...prev, [reviewId]: true }));
    setTimeout(() => setHeartAnimMap((prev) => ({ ...prev, [reviewId]: false })), 600);
    try {
      const res = await fetch(`/api/reviews/${reviewId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLikedMap((prev) => ({ ...prev, [reviewId]: data.liked }));
        setLikesMap((prev) => ({ ...prev, [reviewId]: data.likes_count }));
      } else {
        setLikedMap((prev) => ({ ...prev, [reviewId]: !newLiked }));
        setLikesMap((prev) => ({ ...prev, [reviewId]: (prev[reviewId] ?? 0) - (newLiked ? 1 : -1) }));
      }
    } catch {
      setLikedMap((prev) => ({ ...prev, [reviewId]: !newLiked }));
      setLikesMap((prev) => ({ ...prev, [reviewId]: (prev[reviewId] ?? 0) - (newLiked ? 1 : -1) }));
    } finally {
      setLikingMap((prev) => ({ ...prev, [reviewId]: false }));
    }
  }

  function requireAuth(fn) {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    fn();
  }

  async function handleBacklog(status) {
    requireAuth(async () => {
      setBacklogL(true);
      const token = localStorage.getItem('token');
      const newStatus = backlogStatus === status ? null : status;
      if (newStatus) {
        const backlogRes = await fetch('/api/backlog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ igdb_game_id: gameId, status: newStatus }),
        });
        const backlogData = backlogRes.ok ? await backlogRes.json() : null;
        fireAchievementToasts(backlogData?.new_achievements, addAchievementToast);
        setBacklog(newStatus);
        addToast(BACKLOG_TOAST[newStatus]);
      } else {
        await fetch('/api/backlog', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ igdb_game_id: gameId }),
        });
        setBacklog(null);
        addToast('Eliminado de tu backlog');
      }
      setBacklogL(false);
    });
  }

  async function handleFavoriteToggle() {
    requireAuth(async () => {
      const token = localStorage.getItem('token');
      if (favLoading) return;
      const newFav = !favorited;
      setFavorited(newFav);
      setFavAnim(true);
      setTimeout(() => setFavAnim(false), 600);
      setFavLoading(true);
      try {
        if (newFav) {
          await fetch('/api/favorites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ igdb_game_id: gameId }),
          });
          addToast('Añadido a favoritos ♥');
        } else {
          await fetch(`/api/favorites/${gameId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          addToast('Eliminado de favoritos');
        }
      } catch {
        setFavorited(!newFav);
      } finally {
        setFavLoading(false);
      }
    });
  }

  function handleRateClick() {
    requireAuth(() => setModalOpen(true));
  }

  function handleSubmitted() {
    loadStats();
    loadReviews();
  }

  const avgScore = stats?.avg_score ?? null;
  const totalRatings = stats?.total_ratings ?? 0;

  return (
    <>
      {/* ── Community Score ── */}
      <div className="flex items-center gap-3">
        {avgScore ? (
          <>
            <span className={`${anton.className} text-[#A855F7] text-[48px] leading-none`}>
              {Number(avgScore).toFixed(1)}
            </span>
            <div className="flex flex-col gap-0.5">
              <StarRating value={avgScore} size={16} />
              <span className="text-[#71717A] text-[11px] font-mono">
                {totalRatings} {totalRatings === 1 ? 'valoración' : 'valoraciones'}
              </span>
            </div>
          </>
        ) : (
          <>
            <StarRating value={0} size={18} />
            <span className="text-[#71717A] text-sm font-mono">Sin valoraciones aún</span>
          </>
        )}
      </div>

      {/* ── Action buttons ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleRateClick}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#A855F7] text-[#0A0A0A] text-sm font-semibold hover:bg-[#9333EA] transition-colors cursor-pointer"
        >
          <IconStar size={16} fill="#0A0A0A" color="#0A0A0A" />
          Puntuar
        </button>

        <button
          onClick={() => setShareTarget({ isGame: true, _key: Date.now() })}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#1A1A1A] text-white text-sm hover:bg-[#1A1A1A] transition-colors cursor-pointer"
        >
          <IconShare size={15} />
          Compartir
        </button>

        <button
          onClick={handleFavoriteToggle}
          disabled={favLoading}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm transition-colors cursor-pointer disabled:opacity-50 ${
            favorited
              ? 'border-[#EF4444]/50 text-[#EF4444] bg-[#EF4444]/10 hover:bg-[#EF4444]/20'
              : 'border-[#1A1A1A] text-white hover:bg-[#1A1A1A]'
          }`}
        >
          <span className="relative inline-flex items-center justify-center">
            <span className={favAnim ? 'heart-burst' : ''}>
              <IconHeart size={15} filled={favorited} color={favorited ? '#EF4444' : 'currentColor'} />
            </span>
            {favAnim && (
              <span
                className="heart-ring absolute inset-[-4px] rounded-full pointer-events-none"
                style={{ border: `2px solid ${favorited ? '#EF4444' : '#888'}` }}
              />
            )}
          </span>
          {favorited ? 'En favoritos' : 'Favorito'}
        </button>

        <button
          onClick={() => requireAuth(() => setListModal(true))}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#1A1A1A] text-white text-sm hover:bg-[#1A1A1A] transition-colors cursor-pointer"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          Añadir a lista
        </button>

        {BACKLOG_OPTIONS.map(({ status, label, icon }) => {
          const active = backlogStatus === status;
          return (
            <button
              key={status}
              onClick={() => handleBacklog(status)}
              disabled={backlogLoading}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm transition-colors cursor-pointer disabled:opacity-50 ${
                active
                  ? 'border-[#A855F7] text-[#A855F7] bg-[#A855F7]/10'
                  : 'border-[#71717A] text-white hover:bg-[#1A1A1A]'
              }`}
            >
              {icon}
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Stats row ── */}
      {stats && (
        <div className="flex items-center gap-6 text-[#71717A] font-mono text-[12px]">
          <span><span className="text-white font-semibold">{stats.total_reviews}</span> reseñas</span>
          <span><span className="text-white font-semibold">{stats.total_backlog}</span> en backlog</span>
        </div>
      )}

      {/* ── Reviews section ── */}
      <div className="flex flex-col gap-5 mt-4 pt-6 border-t border-[#1A1A1A]">
        <h2 className={`${anton.className} text-white text-2xl`}>Reseñas</h2>

        {reviews.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#3F3F46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p className="text-[#71717A] text-sm">Sé el primero en escribir una reseña.</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {reviews.map((r) => {
              const isExpanded = expandedReviews.has(r.id);
              const count = commentCounts[r.id] ?? 0;
              return (
                <div key={r.id} id={`review-${r.id}`}>
                  <div className="h-px w-full bg-[#1A1A1A]" />
                  <div className="flex flex-col gap-3 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: '#A855F7' }}
                      >
                        {r.nombre?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <Link href={`/user/${r.username}`} className="text-white text-sm font-semibold hover:text-[#A855F7] transition-colors">
                          @{r.username}
                        </Link>
                        {r.score != null && <StarRating value={parseFloat(r.score)} size={12} />}
                      </div>
                      <span className="text-[#71717A] text-[11px] font-mono ml-auto">
                        {new Date(r.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-[#71717A] text-sm leading-[1.5]">{r.content}</p>

                    {/* Action row */}
                    <div className="flex items-center gap-4 pt-1">
                      {/* Like */}
                      <button
                        onClick={() => handleReviewLike(r.id)}
                        disabled={!!likingMap[r.id]}
                        className={`flex items-center gap-1.5 text-xs transition-colors cursor-pointer ${
                          likedMap[r.id] ? 'text-[#A855F7]' : 'text-[#71717A] hover:text-white'
                        }`}
                      >
                        <span className="relative inline-flex items-center justify-center">
                          <span className={heartAnimMap[r.id] ? 'heart-burst' : ''}>
                            <IconHeart size={14} filled={likedMap[r.id]} color={likedMap[r.id] ? '#A855F7' : 'currentColor'} />
                          </span>
                          {heartAnimMap[r.id] && (
                            <span
                              className="heart-ring absolute inset-[-4px] rounded-full pointer-events-none"
                              style={{ border: `2px solid ${likedMap[r.id] ? '#A855F7' : '#888'}` }}
                            />
                          )}
                        </span>
                        <span>{(likesMap[r.id] ?? 0) > 0 ? likesMap[r.id] : ''}</span>
                      </button>
                      {/* Comments */}
                      <button
                        onClick={() => toggleComments(r.id)}
                        className={`flex items-center gap-1.5 text-xs transition-colors cursor-pointer ${
                          isExpanded ? 'text-[#A855F7]' : 'text-[#71717A] hover:text-white'
                        }`}
                      >
                        <IconMessage />
                        <span>{count > 0 ? count : ''} Comentarios</span>
                      </button>
                      {/* Share */}
                      <button
                        onClick={() => setShareTarget({ reviewId: r.id, username: r.username, score: r.score, content: r.content, _key: Date.now() })}
                        className="flex items-center gap-1.5 text-[#71717A] hover:text-white text-xs transition-colors cursor-pointer ml-auto"
                        title="Compartir reseña"
                      >
                        <IconShare />
                      </button>
                      {/* Report */}
                      {currentUsername && currentUsername !== r.username && (
                        <button
                          onClick={() => setReportTarget({ type: 'review', id: r.id })}
                          className="flex items-center gap-1.5 text-[#71717A] hover:text-red-400 text-xs transition-colors cursor-pointer"
                          title="Reportar reseña"
                        >
                          <IconFlag />
                        </button>
                      )}
                    </div>

                    {/* Expandable comments */}
                    {isExpanded && (
                      <ReviewCommentsSection
                        reviewId={r.id}
                        reviewAuthorUsername={r.username}
                        currentUsername={currentUsername}
                        onCountChange={(c) => setCommentCounts((prev) => ({ ...prev, [r.id]: c }))}
                      />
                    )}
                  </div>
                </div>
              );
            })}
            <div className="h-px w-full bg-[#1A1A1A]" />
          </div>
        )}
      </div>

      {/* ── Rating modal ── */}
      {modalOpen && (
        <RatingModal
          gameId={gameId}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSubmitted}
        />
      )}

      {/* ── Add to list modal ── */}
      {listModalOpen && (
        <AddToListModal
          gameId={gameId}
          onClose={() => setListModal(false)}
        />
      )}

      {/* ── Report modal ── */}
      {reportTarget && (
        <ReportModal
          targetType={reportTarget.type}
          targetId={reportTarget.id}
          onClose={() => setReportTarget(null)}
        />
      )}

      {/* ── Share modal ── */}
      {shareTarget && (
        <ShareModal
          key={shareTarget._key}
          gameId={gameId}
          gameName={gameData?.name}
          gameCover={gameData?.cover}
          gameYear={gameData?.year}
          gameGenre={gameData?.genre}
          gameSummary={gameData?.summary ?? null}
          isGame={!!shareTarget.isGame}
          userScore={shareTarget.score != null ? parseFloat(shareTarget.score) : null}
          reviewContent={shareTarget.content ?? null}
          username={shareTarget.isGame ? currentUsername : shareTarget.username}
          reviewId={shareTarget.reviewId ?? null}
          onClose={() => setShareTarget(null)}
        />
      )}
    </>
  );
}
