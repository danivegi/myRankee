'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Anton, Inter } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import { useToast } from '@/app/components/ToastProvider';
import PasswordStrength from '@/app/components/PasswordStrength';

const anton = Anton({ weight: '400', subsets: ['latin'], display: 'swap' });
const inter = Inter({ subsets: ['latin'], display: 'swap' });

const inputCls =
  'w-full bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl px-4 py-3 text-white text-sm placeholder-[#3F3F46] focus:outline-none focus:border-[#A855F7] transition-colors';

const TABS = [
  { id: 'perfil',         label: 'Perfil',        icon: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></> },
  { id: 'cuenta',         label: 'Cuenta',         icon: <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></> },
  { id: 'notificaciones', label: 'Notificaciones', icon: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></> },
  { id: 'peligro',        label: 'Zona peligro',   icon: <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></> },
];

// ── Canvas resize util ─────────────────────────────────────────────────────────

function resizeImageToBlob(file, size = 400) {
  return new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width  = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      const dim = Math.min(img.width, img.height);
      const sx  = (img.width  - dim) / 2;
      const sy  = (img.height - dim) / 2;
      ctx.drawImage(img, sx, sy, dim, dim, 0, 0, size, size);
      canvas.toBlob(resolve, 'image/jpeg', 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

// ── Section wrapper ────────────────────────────────────────────────────────────

function Section({ title, subtitle, children, danger = false }) {
  return (
    <section className={`rounded-2xl border flex flex-col gap-6 ${
      danger ? 'border-red-900/50 bg-[#0D0505] p-6 sm:p-8' : 'border-[#1A1A1A] bg-[#111111] p-6 sm:p-8'
    }`}>
      <div>
        <h2 className={`${anton.className} text-white text-xl sm:text-2xl`}>{title}</h2>
        {subtitle && <p className="text-[#71717A] text-sm mt-1">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

// ── Profile section ────────────────────────────────────────────────────────────

function ProfileSection({ token, user, onUserUpdate }) {
  const { addToast } = useToast();
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    nombre:   user.nombre   ?? '',
    apellido: user.apellido ?? '',
    bio:      user.bio      ?? '',
  });
  const [avatarUrl,     setAvatarUrl]     = useState(user.avatar_url ?? null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [saving,        setSaving]        = useState(false);

  const initials = ((form.nombre[0] ?? '') + (form.apellido[0] ?? '')).toUpperCase() || '?';

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  }

  async function handleAvatarFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { addToast('El archivo debe ser una imagen', 'error'); return; }

    setAvatarLoading(true);
    try {
      const blob = await resizeImageToBlob(file);
      if (!blob) { addToast('No se pudo procesar la imagen', 'error'); return; }

      const fd = new FormData();
      fd.append('avatar', blob, 'avatar.jpg');

      const res  = await fetch('/api/users/avatar', {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
        body:    fd,
      });
      const data = await res.json();
      if (!res.ok) { addToast(data.error ?? 'Error al subir la imagen', 'error'); return; }
      setAvatarUrl(data.avatar_url);
      onUserUpdate({ avatar_url: data.avatar_url });
      addToast('Avatar actualizado');
    } catch {
      addToast('Error de conexión', 'error');
    } finally {
      setAvatarLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleRemoveAvatar() {
    setAvatarLoading(true);
    try {
      await fetch('/api/users/avatar', {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setAvatarUrl(null);
      onUserUpdate({ avatar_url: null });
      addToast('Avatar eliminado');
    } catch {
      addToast('Error de conexión', 'error');
    } finally {
      setAvatarLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res  = await fetch('/api/users/profile', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { addToast(data.error ?? 'Error al guardar', 'error'); return; }
      onUserUpdate(form);
      addToast('Perfil actualizado');
    } catch {
      addToast('Error de conexión', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Section title="Foto de perfil">
        <div className="flex items-center gap-5">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {avatarUrl ? (
              <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-[#1A1A1A]">
                <Image src={avatarUrl} alt="Avatar" width={80} height={80} className="object-cover w-full h-full" unoptimized />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-[#A855F7] flex items-center justify-center ring-2 ring-[#1A1A1A]">
                <span className={`${anton.className} text-[#0A0A0A] text-2xl leading-none select-none`}>{initials}</span>
              </div>
            )}
            {avatarLoading && (
              <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
            <button
              type="button"
              disabled={avatarLoading}
              onClick={() => fileRef.current?.click()}
              className="px-4 py-2 rounded-xl border border-[#3F3F46] text-white text-sm font-semibold hover:border-[#A855F7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Subir foto
            </button>
            {avatarUrl && (
              <button
                type="button"
                disabled={avatarLoading}
                onClick={handleRemoveAvatar}
                className="px-4 py-2 rounded-xl border border-[#1A1A1A] text-[#71717A] text-sm hover:text-red-400 hover:border-red-900/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Eliminar foto
              </button>
            )}
            <p className="text-[#3F3F46] text-xs">JPG, PNG o GIF · máx 2 MB</p>
          </div>
        </div>
      </Section>

      <Section title="Información personal">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-[#71717A] text-xs font-mono uppercase tracking-wider mb-2">Nombre</label>
              <input type="text" name="nombre" value={form.nombre} onChange={handleChange} required className={inputCls} />
            </div>
            <div className="flex-1">
              <label className="block text-[#71717A] text-xs font-mono uppercase tracking-wider mb-2">Apellidos</label>
              <input type="text" name="apellido" value={form.apellido} onChange={handleChange} required className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-[#71717A] text-xs font-mono uppercase tracking-wider mb-2">
              Nombre de usuario
            </label>
            <input
              type="text"
              value={`@${user.username}`}
              disabled
              className={`${inputCls} opacity-40 cursor-not-allowed`}
            />
            <p className="text-[#3F3F46] text-xs mt-1.5">El nombre de usuario no se puede cambiar.</p>
          </div>

          <div>
            <label className="block text-[#71717A] text-xs font-mono uppercase tracking-wider mb-2">Biografía</label>
            <textarea
              name="bio"
              value={form.bio}
              onChange={handleChange}
              rows={3}
              maxLength={300}
              placeholder="Cuéntanos algo sobre ti..."
              className={`${inputCls} resize-none`}
            />
            <p className="text-[#3F3F46] text-xs mt-1.5 text-right">{form.bio.length}/300</p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-[#A855F7] text-[#0A0A0A] text-sm font-bold hover:bg-[#9333EA] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer w-fit"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </Section>
    </>
  );
}

// ── Banner picker ──────────────────────────────────────────────────────────────

function BannerPickerModal({ onSelect, onClose }) {
  const [query,        setQuery]        = useState('');
  const [games,        setGames]        = useState([]);
  const [searching,    setSearching]    = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [images,       setImages]       = useState(null);
  const [loadingImgs,  setLoadingImgs]  = useState(false);
  const [selectedUrl,  setSelectedUrl]  = useState(null);
  const [position,     setPosition]     = useState(50);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (query.trim().length < 2) { setGames([]); setSearching(false); return; }
    setSearching(true);
    timerRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/games/banner-search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setGames(data.games ?? []);
      } catch { /* non-fatal */ }
      finally   { setSearching(false); }
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  async function pickGame(game) {
    setSelectedGame(game);
    setImages(null);
    setSelectedUrl(null);
    setPosition(50);
    setLoadingImgs(true);
    try {
      const res  = await fetch(`/api/games/${game.id}/banner-images`);
      const data = await res.json();
      setImages(data);
    } catch {
      setImages({ artworks: [], screenshots: [] });
    } finally {
      setLoadingImgs(false);
    }
  }

  function resetToSearch() {
    setSelectedGame(null);
    setImages(null);
    setSelectedUrl(null);
    setPosition(50);
  }

  function selectImage(url) {
    setSelectedUrl(url);
    setPosition(50);
  }

  const allImgs = images ? [...(images.artworks ?? []), ...(images.screenshots ?? [])] : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] rounded-2xl border border-[#1A1A1A] bg-[#111111] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1A1A1A]">
          <h3 className={`${anton.className} text-white text-xl`}>Elegir banner</h3>
          <button onClick={onClose} className="text-[#71717A] hover:text-white transition-colors cursor-pointer p-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 min-h-0">

          {/* ── Step 1: game search ── */}
          {!selectedGame && (
            <>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Busca un videojuego..."
                  className={inputCls}
                />
                {searching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-[#3F3F46] border-t-[#A855F7] rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {games.length > 0 && (
                <div className="flex flex-col gap-1">
                  {games.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => pickGame(g)}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#1A1A1A] transition-colors text-left cursor-pointer"
                    >
                      {g.cover ? (
                        <div className="relative w-8 h-10 flex-shrink-0 rounded overflow-hidden bg-[#0A0A0A]">
                          <Image src={g.cover} alt={g.name} fill sizes="32px" className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-8 h-10 flex-shrink-0 rounded bg-[#1A1A1A]" />
                      )}
                      <span className="text-white text-sm">{g.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {!searching && query.trim().length >= 2 && games.length === 0 && (
                <p className="text-[#71717A] text-sm">No se encontraron juegos.</p>
              )}
            </>
          )}

          {/* ── Step 2: image gallery ── */}
          {selectedGame && (
            <>
              <div className="flex items-center gap-3">
                <button
                  onClick={resetToSearch}
                  className="text-[#71717A] hover:text-white transition-colors cursor-pointer"
                  aria-label="Volver a búsqueda"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
                  </svg>
                </button>
                <span className="text-white text-sm font-semibold">{selectedGame.name}</span>
              </div>

              {/* Live preview + position slider */}
              {selectedUrl && (
                <div className="flex flex-col gap-3">
                  {/* Banner preview — matches DESKTOP profile banner (5.5 / 1 = 11/2) */}
                  <div className="relative w-full rounded-xl overflow-hidden ring-1 ring-[#A855F7]/40" style={{ aspectRatio: '11 / 2' }}>
                    <Image
                      src={selectedUrl}
                      alt="Preview banner"
                      fill
                      sizes="(max-width: 672px) 100vw, 672px"
                      className="object-cover"
                      style={{ objectPosition: `50% ${position}%` }}
                    />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(10,10,10,0.55) 100%)' }} />
                    <span className="absolute bottom-2 left-3 text-white/50 text-[10px] font-mono select-none">Vista previa</span>
                  </div>

                  {/* Vertical position slider */}
                  <div className="flex items-center gap-3">
                    <span className="text-[#3F3F46] text-[11px] font-mono w-10 text-right flex-shrink-0">Arriba</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={position}
                      onChange={(e) => setPosition(Number(e.target.value))}
                      className="flex-1 h-1.5 rounded-full cursor-pointer accent-[#A855F7]"
                      aria-label="Posición vertical del banner"
                    />
                    <span className="text-[#3F3F46] text-[11px] font-mono w-10 flex-shrink-0">Abajo</span>
                  </div>
                </div>
              )}

              {loadingImgs && (
                <div className="flex justify-center py-10">
                  <div className="w-6 h-6 border-2 border-[#3F3F46] border-t-[#A855F7] rounded-full animate-spin" />
                </div>
              )}

              {!loadingImgs && allImgs.length === 0 && (
                <p className="text-[#71717A] text-sm leading-relaxed">
                  Este juego no tiene imágenes horizontales disponibles. Prueba con otro juego.
                </p>
              )}

              {!loadingImgs && allImgs.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {allImgs.map((img) => (
                    <button
                      key={img.id}
                      onClick={() => selectImage(img.full)}
                      className={`relative aspect-video rounded-lg overflow-hidden ring-2 transition-all cursor-pointer ${
                        selectedUrl === img.full
                          ? 'ring-[#A855F7]'
                          : 'ring-transparent hover:ring-[#3F3F46]'
                      }`}
                    >
                      <Image
                        src={img.thumb}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 50vw, 33vw"
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer — only visible when an image is selected */}
        {selectedUrl && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#1A1A1A]">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-[#3F3F46] text-white text-sm hover:border-[#71717A] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={() => onSelect({ url: selectedUrl, position })}
              className="px-5 py-2.5 rounded-xl bg-[#A855F7] text-[#0A0A0A] text-sm font-bold hover:bg-[#9333EA] transition-colors cursor-pointer"
            >
              Guardar banner
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function BannerSection({ token, user, onUserUpdate }) {
  const { addToast } = useToast();
  const [bannerUrl,      setBannerUrl]      = useState(user.banner_url ?? null);
  const [bannerPosition, setBannerPosition] = useState(user.banner_position ?? 50);
  const [showPicker,     setShowPicker]     = useState(false);
  const [saving,         setSaving]         = useState(false);

  async function save(url, position = 50) {
    setSaving(true);
    try {
      const res  = await fetch('/api/users/banner', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ banner_url: url, banner_position: url ? position : 50 }),
      });
      const data = await res.json();
      if (!res.ok) { addToast(data.error ?? 'Error al guardar el banner', 'error'); return; }
      setBannerUrl(url);
      setBannerPosition(url ? position : 50);
      onUserUpdate({ banner_url: url, banner_position: url ? position : 50 });
      addToast(url ? 'Banner actualizado' : 'Banner eliminado');
    } catch {
      addToast('Error de conexión', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title="Banner de perfil" subtitle="Elige una imagen de un videojuego como banner en tu perfil.">
      {/* Preview */}
      <div className="relative h-[110px] w-full rounded-xl overflow-hidden bg-[#0A0A0A]">
        <Image
          src={(bannerUrl || '/images/1.png').replace('/t_1080p/', '/t_original/')}
          alt="Banner actual"
          fill
          sizes="(max-width: 1024px) 100vw, 672px"
          className="object-cover"
          style={{ objectPosition: `50% ${bannerPosition}%` }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(10,10,10,0.75) 100%)' }} />
        {!bannerUrl && (
          <span className="absolute bottom-2 left-3 text-[#3F3F46] text-[11px] font-mono">Banner por defecto</span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => setShowPicker(true)}
          className="px-4 py-2 rounded-xl border border-[#3F3F46] text-white text-sm font-semibold hover:border-[#A855F7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          Cambiar banner
        </button>
        {bannerUrl && (
          <button
            type="button"
            disabled={saving}
            onClick={() => save(null)}
            className="px-4 py-2 rounded-xl border border-[#1A1A1A] text-[#71717A] text-sm hover:text-red-400 hover:border-red-900/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? 'Guardando...' : 'Quitar banner'}
          </button>
        )}
      </div>

      {showPicker && (
        <BannerPickerModal
          onSelect={({ url, position }) => { setShowPicker(false); save(url, position); }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </Section>
  );
}

// ── Social icon helper ─────────────────────────────────────────────────────────

function SocialIcon({ platform, size = 18 }) {
  const s = { width: size, height: size, viewBox: '0 0 24 24', strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (platform) {
    case 'twitter':   return <svg {...s} fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>;
    case 'instagram': return <svg {...s} fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>;
    case 'twitch':    return <svg {...s} fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M21 2H3v16h5v4l4-4h5l4-4V2z"/><line x1="11" y1="7" x2="11" y2="11"/><line x1="16" y1="7" x2="16" y2="11"/></svg>;
    case 'youtube':   return <svg {...s} fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.54C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg>;
    case 'steam':     return <svg {...s} fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.544-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/><line x1="6" y1="11" x2="10" y2="11"/><line x1="8" y1="9" x2="8" y2="13"/><line x1="15" y1="12" x2="15.01" y2="12" strokeWidth="3"/><line x1="18" y1="10" x2="18.01" y2="10" strokeWidth="3"/></svg>;
    case 'discord':   return <svg {...s} fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M8.5 5.5C7 5.8 5.5 6.5 4.5 8 3 10 2.5 13 2.5 15c1 1.5 3 2.5 4.5 3"/><path d="M15.5 5.5C17 5.8 18.5 6.5 19.5 8 21 10 21.5 13 21.5 15c-1 1.5-3 2.5-4.5 3"/><path d="M7.5 7.5C8.5 7 10 6.5 12 6.5s3.5.5 4.5 1"/><path d="M7.5 16.5C8.5 17 10 17.5 12 17.5s3.5-.5 4.5-1"/><circle cx="9" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1" fill="currentColor" stroke="none"/></svg>;
    case 'tiktok':    return <svg {...s} fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-2.73 30.35 30.35 0 00-.08-4.96h-4v13.28a2.92 2.92 0 01-2.91 2.7 2.92 2.92 0 01-2.91-2.91 2.92 2.92 0 012.91-2.91c.28 0 .54.04.79.1V9.35a6.93 6.93 0 00-.79-.05 6.91 6.91 0 00-6.91 6.91 6.91 6.91 0 006.91 6.91 6.91 6.91 0 006.91-6.91V9.73a9.71 9.71 0 005.68 1.8V7.69a4.83 4.83 0 01-1.83-.99z"/></svg>;
    default:          return <svg {...s} fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;
  }
}

// ── Social links section ───────────────────────────────────────────────────────

const SOCIAL_PLATFORMS = [
  { key: 'twitter',   label: 'Twitter / X', placeholder: 'https://x.com/tuusuario'                       },
  { key: 'instagram', label: 'Instagram',   placeholder: 'https://instagram.com/tuusuario'               },
  { key: 'twitch',    label: 'Twitch',      placeholder: 'https://twitch.tv/tucanal'                     },
  { key: 'youtube',   label: 'YouTube',     placeholder: 'https://youtube.com/@tucanal'                  },
  { key: 'steam',     label: 'Steam',       placeholder: 'https://steamcommunity.com/id/tuusuario'       },
  { key: 'discord',   label: 'Discord',     placeholder: 'TuUsuario  ||  TuUsuario#1234', isText: true     },
  { key: 'tiktok',    label: 'TikTok',      placeholder: 'https://tiktok.com/@tuusuario'                 },
];

function SocialLinksSection({ token, username }) {
  const { addToast } = useToast();
  const [links,  setLinks]  = useState(() => Object.fromEntries(SOCIAL_PLATFORMS.map((p) => [p.key, ''])));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!username) return;
    fetch(`/api/users/${username}/social-links`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => {
        setLinks((prev) => {
          const next = { ...prev };
          for (const row of rows) if (row.platform in next) next[row.platform] = row.url;
          return next;
        });
      })
      .catch(() => {});
  }, [username]);

  async function handleSubmit(e) {
    e.preventDefault();
    for (const [platform, url] of Object.entries(links)) {
      if (!url.trim()) continue;
      if (platform === 'discord') continue; // free-text field, no URL validation
      try {
        const u = new URL(url.trim());
        if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error();
      } catch {
        addToast(`URL inválida para ${platform}`, 'error');
        return;
      }
    }
    setSaving(true);
    try {
      const res = await fetch('/api/users/social-links', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify(links),
      });
      const data = await res.json();
      if (!res.ok) { addToast(data.error ?? 'Error al guardar', 'error'); return; }
      addToast('Redes sociales actualizadas');
    } catch {
      addToast('Error de conexión', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title="Redes sociales" subtitle="Añade tus perfiles en redes sociales. Deja en blanco los que no quieras mostrar.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {SOCIAL_PLATFORMS.map(({ key, label, placeholder, isText }) => (
          <div key={key} className="flex items-center gap-3">
            <div className="w-8 flex-shrink-0 flex items-center justify-center text-[#71717A]">
              <SocialIcon platform={key} size={18} />
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-[#71717A] text-xs font-mono uppercase tracking-wider">{label}</label>
              <input
                type={isText ? 'text' : 'url'}
                value={links[key]}
                onChange={(e) => setLinks((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder={placeholder}
                maxLength={isText ? 40 : undefined}
                className={inputCls}
              />
            </div>
          </div>
        ))}
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 rounded-xl bg-[#A855F7] text-[#0A0A0A] text-sm font-bold hover:bg-[#9333EA] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer w-fit mt-2"
        >
          {saving ? 'Guardando...' : 'Guardar redes sociales'}
        </button>
      </form>
    </Section>
  );
}

// ── Password section ───────────────────────────────────────────────────────────

function PasswordSection({ token }) {
  const { addToast } = useToast();
  const [form,   setForm]   = useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState(null);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setError(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.next !== form.confirm) { setError('Las contraseñas nuevas no coinciden'); return; }
    setSaving(true); setError(null);
    try {
      const res  = await fetch('/api/users/password', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ current_password: form.current, new_password: form.next }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error al cambiar la contraseña'); addToast(data.error ?? 'Error al cambiar la contraseña', 'error'); }
      else { setForm({ current: '', next: '', confirm: '' }); addToast('¡Contraseña cambiada correctamente!'); }
    } catch {
      setError('Error de conexión');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title="Cambiar contraseña">
      <form onSubmit={handleSubmit} autoComplete="off" className="flex flex-col gap-5">
        <div>
          <label className="block text-[#71717A] text-xs font-mono uppercase tracking-wider mb-2">Contraseña actual</label>
          <input type="password" name="current" value={form.current} onChange={handleChange} placeholder="••••••••" required autoComplete="new-password" className={inputCls} />
        </div>
        <div>
          <label className="block text-[#71717A] text-xs font-mono uppercase tracking-wider mb-2">Nueva contraseña</label>
          <input type="password" name="next" value={form.next} onChange={handleChange} required autoComplete="new-password" className={inputCls} />
          <PasswordStrength password={form.next} />
        </div>
        <div>
          <label className="block text-[#71717A] text-xs font-mono uppercase tracking-wider mb-2">Confirmar nueva contraseña</label>
          <input type="password" name="confirm" value={form.confirm} onChange={handleChange} placeholder="Repite la nueva contraseña" required autoComplete="new-password" className={inputCls} />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="submit" disabled={saving} className="px-6 py-3 rounded-xl bg-[#A855F7] text-[#0A0A0A] text-sm font-bold hover:bg-[#9333EA] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer w-fit">
          {saving ? 'Guardando...' : 'Cambiar contraseña'}
        </button>
      </form>
    </Section>
  );
}

// ── Email section ──────────────────────────────────────────────────────────────

function EmailSection({ token, currentEmail, onEmailUpdate }) {
  const { addToast } = useToast();
  const [form,   setForm]   = useState({ new_email: '', password: '' });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState(null);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setError(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const res  = await fetch('/api/users/email', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error al actualizar el correo'); }
      else { setForm({ new_email: '', password: '' }); onEmailUpdate(form.new_email); addToast('Correo actualizado correctamente'); }
    } catch {
      setError('Error de conexión');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title="Cambiar correo electrónico" subtitle={`Correo actual: ${currentEmail}`}>
      <form onSubmit={handleSubmit} autoComplete="off" className="flex flex-col gap-5">
        <div>
          <label className="block text-[#71717A] text-xs font-mono uppercase tracking-wider mb-2">Nuevo correo</label>
          <input type="email" name="new_email" value={form.new_email} onChange={handleChange} placeholder="nuevo@correo.com" required autoComplete="off" className={inputCls} />
        </div>
        <div>
          <label className="block text-[#71717A] text-xs font-mono uppercase tracking-wider mb-2">Contraseña actual</label>
          <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="••••••••" required autoComplete="new-password" className={inputCls} />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="submit" disabled={saving} className="px-6 py-3 rounded-xl bg-[#A855F7] text-[#0A0A0A] text-sm font-bold hover:bg-[#9333EA] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer w-fit">
          {saving ? 'Guardando...' : 'Actualizar correo'}
        </button>
      </form>
    </Section>
  );
}

// ── Notification toggle ────────────────────────────────────────────────────────

const PREF_META = {
  comments_on_reviews: { label: 'Comentarios en tus reseñas',       desc: 'Cuando alguien comenta en una de tus reseñas.' },
  new_followers:       { label: 'Nuevos seguidores',                 desc: 'Cuando alguien empieza a seguirte.' },
  follows_back:        { label: 'Te siguen de vuelta',               desc: 'Cuando un usuario al que sigues te sigue también.' },
  review_likes:        { label: 'Likes en tus reseñas',              desc: 'Cuando a alguien le gusta una de tus reseñas.' },
  list_likes:          { label: 'Likes en tus listas',               desc: 'Cuando a alguien le gusta una de tus listas.' },
};

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? 'bg-[#A855F7]' : 'bg-[#3F3F46]'
      }`}
    >
      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

function NotificationsSection({ token }) {
  const { addToast } = useToast();
  const [prefs,   setPrefs]   = useState(null);
  const [saving,  setSaving]  = useState(null); // key being saved

  useEffect(() => {
    fetch('/api/users/notification-preferences', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.preferences) setPrefs(data.preferences); })
      .catch(() => {});
  }, [token]);

  async function handleToggle(key, value) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setSaving(key);
    try {
      const res = await fetch('/api/users/notification-preferences', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify(next),
      });
      if (!res.ok) { setPrefs(prefs); addToast('Error al guardar la preferencia', 'error'); }
    } catch {
      setPrefs(prefs);
      addToast('Error de conexión', 'error');
    } finally {
      setSaving(null);
    }
  }

  return (
    <Section title="Notificaciones" subtitle="Elige qué notificaciones quieres recibir.">
      {prefs === null ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-[#1A1A1A] last:border-0 animate-pulse">
              <div className="flex flex-col gap-1.5">
                <div className="h-3.5 w-40 bg-[#1A1A1A] rounded" />
                <div className="h-3 w-56 bg-[#1A1A1A] rounded" />
              </div>
              <div className="h-6 w-11 bg-[#1A1A1A] rounded-full flex-shrink-0" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col">
          {Object.entries(PREF_META).map(([key, { label, desc }]) => (
            <div key={key} className="flex items-center justify-between gap-4 py-4 border-b border-[#1A1A1A] last:border-0">
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-white text-sm font-medium">{label}</span>
                <span className="text-[#71717A] text-xs leading-relaxed">{desc}</span>
              </div>
              <Toggle
                checked={prefs[key] ?? false}
                onChange={(v) => handleToggle(key, v)}
                disabled={saving === key}
              />
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

// ── Export section ─────────────────────────────────────────────────────────────

function DataExportSection({ token }) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const res = await fetch('/api/users/export-data', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { addToast('Error al exportar los datos', 'error'); return; }
      const blob  = await res.blob();
      const cd    = res.headers.get('content-disposition') ?? '';
      const match = cd.match(/filename="([^"]+)"/);
      const name  = match ? match[1] : 'myrankee-datos.json';
      const url   = URL.createObjectURL(blob);
      const a     = document.createElement('a');
      a.href = url; a.download = name; a.click();
      URL.revokeObjectURL(url);
      addToast('Datos exportados correctamente');
    } catch {
      addToast('Error de conexión al exportar', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Section title="Exportar mis datos" subtitle="Descarga toda tu información en formato JSON: perfil, reseñas, listas, backlog y más.">
      <button
        onClick={handleExport}
        disabled={loading}
        className="flex items-center gap-2 px-5 py-3 rounded-xl border border-[#3F3F46] text-white text-sm font-semibold hover:border-[#A855F7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer w-fit"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        {loading ? 'Exportando...' : 'Exportar datos'}
      </button>
    </Section>
  );
}

// ── Danger / delete section ────────────────────────────────────────────────────

function DangerSection({ token, username, onLogout }) {
  const router = useRouter();
  const { addToast } = useToast();

  const [showModal,    setShowModal]    = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [password,     setPassword]     = useState('');
  const [confirmed,    setConfirmed]    = useState(false);
  const [deleting,     setDeleting]     = useState(false);
  const [deleteError,  setDeleteError]  = useState('');

  const canDelete = confirmInput === username && password.length >= 1 && confirmed;

  function openModal()  { setShowModal(true); setConfirmInput(''); setPassword(''); setConfirmed(false); setDeleteError(''); }
  function closeModal() { if (deleting) return; setShowModal(false); }

  async function handleDelete() {
    if (!canDelete) return;
    setDeleting(true); setDeleteError('');
    try {
      const res  = await fetch('/api/users/delete-account', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) { setDeleteError(data.error ?? 'Error al eliminar la cuenta'); return; }
      localStorage.removeItem('token');
      setShowModal(false);
      addToast('Tu cuenta ha sido eliminada.');
      setTimeout(() => router.push('/'), 1200);
    } catch {
      setDeleteError('Error de conexión.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Section title="Zona de peligro" danger>
        <p className="text-[#71717A] text-sm -mt-2">Estas acciones son irreversibles. Procede con cuidado.</p>

        <div className="flex items-center justify-between p-4 rounded-xl border border-red-900/40 bg-[#110808]">
          <div>
            <p className="text-white text-sm font-semibold">Cerrar sesión</p>
            <p className="text-[#71717A] text-xs mt-0.5">Cierra tu sesión en este dispositivo.</p>
          </div>
          <button onClick={onLogout} className="px-5 py-2 rounded-xl border border-red-600 text-red-400 text-sm font-semibold hover:bg-red-600 hover:text-white transition-colors cursor-pointer flex-shrink-0">
            Cerrar sesión
          </button>
        </div>

        <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-red-900/40 bg-[#110808]">
          <div>
            <p className="text-white text-sm font-semibold">Eliminar mi cuenta</p>
            <p className="text-[#71717A] text-xs mt-0.5 max-w-sm leading-relaxed">
              Acción irreversible. Se eliminarán tu perfil, reseñas, listas, comentarios y todos tus datos.
            </p>
          </div>
          <button onClick={openModal} className="flex-shrink-0 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors cursor-pointer">
            Eliminar cuenta
          </button>
        </div>
      </Section>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
          onClick={closeModal}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-red-900/60 bg-[#0D0505] p-8 flex flex-col gap-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div>
                <h3 className={`${anton.className} text-white text-xl`}>Eliminar cuenta</h3>
                <p className="text-[#71717A] text-sm mt-1">Esta acción no se puede deshacer.</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[#9CA3AF] text-xs">
                Escribe <span className="text-white font-mono">{username}</span> para confirmar:
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder={username}
                autoComplete="off"
                className="bg-[#111111] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white text-sm placeholder-[#3F3F46] focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[#9CA3AF] text-xs">Introduce tu contraseña:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="bg-[#111111] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white text-sm placeholder-[#3F3F46] focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5 flex-shrink-0">
                <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="sr-only" />
                <div className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${confirmed ? 'bg-red-600 border-red-600' : 'bg-[#111111] border-[#2A2A2A] group-hover:border-red-900'}`}>
                  {confirmed && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
              </div>
              <span className="text-[#9CA3AF] text-xs leading-relaxed">
                Entiendo que esta acción es <strong className="text-red-400">irreversible</strong> y que
                todos mis datos serán eliminados permanentemente.
              </span>
            </label>

            {deleteError && <p className="text-red-400 text-sm">{deleteError}</p>}

            <div className="flex gap-3">
              <button onClick={closeModal} disabled={deleting} className="flex-1 py-3 rounded-xl border border-[#2A2A2A] text-white text-sm font-semibold hover:border-[#3F3F46] transition-colors cursor-pointer disabled:opacity-50">
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={!canDelete || deleting}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? 'Eliminando...' : 'Eliminar definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Main settings content ──────────────────────────────────────────────────────

function SettingsContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const activeTab    = searchParams.get('tab') ?? 'perfil';

  const [token,   setToken]   = useState(null);
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) { router.push('/login'); return; }
    setToken(t);
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.user) { router.push('/login'); return; }
        setUser(data.user);
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, []);

  const handleUserUpdate = useCallback((patch) => {
    setUser((prev) => ({ ...prev, ...patch }));
  }, []);

  function handleLogout() {
    localStorage.removeItem('token');
    router.push('/');
  }

  function setTab(id) {
    router.push(`/settings?tab=${id}`, { scroll: false });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#3F3F46] border-t-[#A855F7] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`${inter.className} min-h-screen bg-[#0A0A0A] w-full`}>
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Page header */}
        <div className="mb-8 flex items-center gap-3">
          <Link
            href={`/user/${user?.username}`}
            className="group inline-flex items-center gap-1.5 text-[#71717A] hover:text-white transition-colors duration-200 text-sm"
          >
            <svg
              width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="transition-transform duration-200 group-hover:-translate-x-1"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Volver al perfil
          </Link>
        </div>
        <h1 className={`${anton.className} text-white text-3xl sm:text-4xl mb-8`}>Configuración</h1>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 items-start">

          {/* ── Sidebar ── */}
          <nav className="w-full lg:w-52 flex-shrink-0">
            {/* Mobile: horizontal scroll */}
            <div className="flex lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0">
              {TABS.map(({ id, label, icon }) => {
                const active = activeTab === id;
                const isDanger = id === 'peligro';
                return (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors cursor-pointer flex-shrink-0 lg:w-full ${
                      active
                        ? isDanger
                          ? 'bg-red-900/30 text-red-400'
                          : 'bg-[#A855F7]/15 text-[#A855F7]'
                        : isDanger
                          ? 'text-[#71717A] hover:text-red-400 hover:bg-red-900/10'
                          : 'text-[#71717A] hover:text-white hover:bg-[#1A1A1A]'
                    }`}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                      {icon}
                    </svg>
                    {label}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* ── Content ── */}
          <div className="flex-1 min-w-0 flex flex-col gap-6">
            {activeTab === 'perfil' && user && (
              <>
                <ProfileSection token={token} user={user} onUserUpdate={handleUserUpdate} />
                <BannerSection  token={token} user={user} onUserUpdate={handleUserUpdate} />
                <SocialLinksSection token={token} username={user.username} />
              </>
            )}

            {activeTab === 'cuenta' && (
              <>
                <EmailSection
                  token={token}
                  currentEmail={user?.email ?? ''}
                  onEmailUpdate={(email) => handleUserUpdate({ email })}
                />
                <PasswordSection token={token} />
              </>
            )}

            {activeTab === 'notificaciones' && (
              <NotificationsSection token={token} />
            )}

            {activeTab === 'peligro' && (
              <>
                <DataExportSection token={token} />
                <DangerSection token={token} username={user?.username ?? ''} onLogout={handleLogout} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page export (Suspense required for useSearchParams) ────────────────────────

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#3F3F46] border-t-[#A855F7] rounded-full animate-spin" />
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}
