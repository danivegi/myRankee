'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Anton, Inter } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';

const anton = Anton({ weight: '400', subsets: ['latin'], display: 'swap' });
const inter = Inter({ subsets: ['latin'], display: 'swap' });

// ── Shared input style ────────────────────────────────────────────────────────

const inputCls =
  'w-full bg-[#111111] border border-[#1A1A1A] rounded-xl px-4 py-3 text-white text-sm placeholder-[#3F3F46] focus:outline-none focus:border-[#A855F7] transition-colors';

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EditProfilePage() {
  const router = useRouter();

  const [token,   setToken]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [status,  setStatus]  = useState(null); // { type: 'success'|'error', msg }

  const [form, setForm] = useState({
    nombre:     '',
    apellido:   '',
    username:   '',
    bio:        '',
    avatar_url: '',
  });

  // ── Load current user data ────────────────────────────────────────────────
  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) { router.push('/login'); return; }
    setToken(t);

    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.user) { router.push('/login'); return; }
        const u = data.user;
        setForm({
          nombre:     u.nombre     ?? '',
          apellido:   u.apellido   ?? '',
          username:   u.username   ?? '',
          bio:        u.bio        ?? '',
          avatar_url: u.avatar_url ?? '',
        });
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setStatus(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setStatus(null);

    try {
      const res = await fetch('/api/users/profile', {
        method:  'PUT',
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${token}`,
        },
        body: JSON.stringify({
          nombre:     form.nombre,
          apellido:   form.apellido,
          bio:        form.bio,
          avatar_url: form.avatar_url,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatus({ type: 'error', msg: data.error ?? 'Error al guardar' });
      } else {
        setStatus({ type: 'success', msg: 'Perfil actualizado correctamente' });
      }
    } catch {
      setStatus({ type: 'error', msg: 'Error de conexión' });
    } finally {
      setSaving(false);
    }
  }

  // ── Avatar preview ────────────────────────────────────────────────────────
  const initials =
    (form.nombre.charAt(0) + (form.apellido.charAt(0) ?? '')).toUpperCase();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <span className="text-[#71717A] text-sm">Cargando...</span>
      </div>
    );
  }

  return (
    <div className={`${inter.className} min-h-screen bg-[#0A0A0A] w-full`}>
      <Navbar />

      <div className="max-w-2xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <Link href={`/user/${form.username}`} className="text-[#71717A] hover:text-white transition-colors text-sm">
            ← Volver al perfil
          </Link>
        </div>

        <h1 className={`${anton.className} text-white text-[36px] leading-tight mb-8`}>
          Editar perfil
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-8">

          {/* Avatar preview */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              {form.avatar_url ? (
                <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-[#1A1A1A]">
                  <Image
                    src={form.avatar_url}
                    alt="Avatar"
                    width={96}
                    height={96}
                    className="object-cover w-full h-full"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-[#A855F7] flex items-center justify-center ring-4 ring-[#1A1A1A]">
                  <span className={`${anton.className} text-[#0A0A0A] text-[32px] leading-none select-none`}>
                    {initials || '?'}
                  </span>
                </div>
              )}
            </div>

            {/* Avatar URL input */}
            <div className="w-full">
              <label className="block text-[#71717A] text-xs font-mono uppercase tracking-wider mb-2">
                URL de foto de perfil
              </label>
              <input
                type="url"
                name="avatar_url"
                value={form.avatar_url}
                onChange={handleChange}
                placeholder="https://ejemplo.com/foto.jpg"
                className={inputCls}
              />
              <p className="text-[#3F3F46] text-xs mt-1.5">
                Pega la URL de una imagen externa. El avatar se actualiza al guardar.
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[#1A1A1A]" />

          {/* Nombre + Apellido */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-[#71717A] text-xs font-mono uppercase tracking-wider mb-2">
                Nombre
              </label>
              <input
                type="text"
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                placeholder="Tu nombre"
                required
                className={inputCls}
              />
            </div>
            <div className="flex-1">
              <label className="block text-[#71717A] text-xs font-mono uppercase tracking-wider mb-2">
                Apellido
              </label>
              <input
                type="text"
                name="apellido"
                value={form.apellido}
                onChange={handleChange}
                placeholder="Tu apellido"
                required
                className={inputCls}
              />
            </div>
          </div>

          {/* Username (read-only) */}
          <div>
            <label className="block text-[#71717A] text-xs font-mono uppercase tracking-wider mb-2">
              Nombre de usuario
            </label>
            <input
              type="text"
              name="username"
              value={`@${form.username}`}
              disabled
              className={`${inputCls} opacity-40 cursor-not-allowed`}
            />
            <p className="text-[#3F3F46] text-xs mt-1.5">
              El nombre de usuario no se puede cambiar.
            </p>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-[#71717A] text-xs font-mono uppercase tracking-wider mb-2">
              Biografía
            </label>
            <textarea
              name="bio"
              value={form.bio}
              onChange={handleChange}
              placeholder="Cuéntanos algo sobre ti..."
              rows={4}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Status message */}
          {status && (
            <p className={`text-sm text-center font-medium ${
              status.type === 'success' ? 'text-green-400' : 'text-red-400'
            }`}>
              {status.msg}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl bg-[#A855F7] text-[#0A0A0A] text-sm font-bold hover:bg-[#9333EA] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>

        </form>
      </div>
    </div>
  );
}
