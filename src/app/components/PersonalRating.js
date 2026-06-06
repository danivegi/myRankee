'use client';

import { useState, useEffect } from 'react';

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

// undefined = still loading, null = logged in but no rating, number = has rating
export default function PersonalRating({ gameId }) {
  const [score,    setScore]    = useState(undefined);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoggedIn(false); setScore(null); return; }
    setLoggedIn(true);
    fetch(`/api/ratings?igdb_game_id=${gameId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setScore(data?.score != null ? parseFloat(data.score) : null))
      .catch(() => setScore(null));
  }, [gameId]);

  // Not logged in, or still loading — render nothing so layout doesn't jump on SSR
  if (!loggedIn || score === undefined) return null;

  const full  = score != null ? Math.floor(score) : 0;
  const half  = score != null && score % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1">
        {Array.from({ length: full  }).map((_, i) => <IconStar     key={`f${i}`} size={20} fill="#A855F7" color="#A855F7" />)}
        {half &&                                       <IconStarHalf              size={20} color="#A855F7" />}
        {Array.from({ length: empty }).map((_, i) => <IconStar     key={`e${i}`} size={20} fill="none"    color="#3F3F46" />)}
      </div>
      {score != null ? (
        <div className="flex flex-col leading-tight">
          <span className="text-white font-bold text-xl">{score.toFixed(1)}</span>
          <span className="text-[#71717A] text-xs font-mono">Tu valoración personal</span>
        </div>
      ) : (
        <span className="text-[#71717A] text-xs font-mono">Sin valorar aún</span>
      )}
    </div>
  );
}