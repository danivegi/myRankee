'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Anton, Inter } from 'next/font/google';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import { useToast } from '@/app/components/ToastProvider';
import PasswordStrength from '@/app/components/PasswordStrength';

const anton = Anton({ weight: '400', subsets: ['latin'], display: 'swap' });
const inter = Inter({ subsets: ['latin'], display: 'swap' });

const inputCls =
  'w-full bg-[#111111] border border-[#1A1A1A] rounded-xl px-4 py-3 text-white text-sm placeholder-[#3F3F46] focus:outline-none focus:border-[#A855F7] transition-colors';

// ── Section wrapper ────────────────────────────────────────────────────────────

function Section({ title, children, danger = false }) {
  return (
    <section className={`rounded-2xl border p-8 flex flex-col gap-6 ${
      danger ? 'border-red-900/60 bg-[#0D0505]' : 'border-[#1A1A1A] bg-[#111111]'
    }`}>
      <h2 className={`${anton.className} text-white text-2xl`}>{title}</h2>
      {children}
    </section>
  );
}

// ── Change password ────────────────────────────────────────────────────────────

function PasswordSection({ token }) {
  const { addToast } = useToast();
  const [form,   setForm]   = useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setStatus(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.next !== form.confirm) {
      setStatus({ type: 'error', msg: 'Las contraseñas nuevas no coinciden' });
      return;
    }
    setSaving(true); setStatus(null);
    try {
      const res  = await fetch('/api/users/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_password: form.current, new_password: form.next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ type: 'error', msg: data.error ?? 'Error al cambiar la contraseña' });
        addToast(data.error ?? 'Error al cambiar la contraseña', 'error');
      } else {
        setStatus({ type: 'success', msg: data.message ?? 'Contraseña actualizada' });
        setForm({ current: '', next: '', confirm: '' });
        addToast('¡Contraseña cambiada correctamente!');
      }
    } catch {
      setStatus({ type: 'error', msg: 'Error de conexión' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title="Cambiar contraseña">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="block text-[#71717A] text-xs font-mono uppercase tracking-wider mb-2">Contraseña actual</label>
          <input type="password" name="current" value={form.current} onChange={handleChange} placeholder="••••••••" required autoComplete="current-password" className={inputCls} />
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
        {status && (
          <p className={`text-sm font-medium ${status.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>{status.msg}</p>
        )}
        <button type="submit" disabled={saving} className="px-6 py-3 rounded-xl bg-[#A855F7] text-[#0A0A0A] text-sm font-bold hover:bg-[#9333EA] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer w-fit">
          {saving ? 'Guardando...' : 'Cambiar contraseña'}
        </button>
      </form>
    </Section>
  );
}

// ── Data export ────────────────────────────────────────────────────────────────

function DataExportSection({ token }) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const res = await fetch('/api/users/export-data', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { addToast('Error al exportar los datos', 'error'); return; }
      const blob     = await res.blob();
      const cd       = res.headers.get('content-disposition') ?? '';
      const match    = cd.match(/filename="([^"]+)"/);
      const filename = match ? match[1] : 'myrankee-datos.json';
      const url      = URL.createObjectURL(blob);
      const a        = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      addToast('Datos exportados correctamente');
    } catch {
      addToast('Error de conexión al exportar', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Section title="Exportar mis datos">
      <p className="text-[#71717A] text-sm leading-relaxed">
        Descarga toda tu información personal en formato JSON: perfil, puntuaciones, reseñas, listas,
        backlog, comentarios, logros y relaciones sociales.{' '}
        <Link href="/privacy#derechos" className="text-[#A855F7] hover:underline">Más sobre tus derechos GDPR</Link>
      </p>
      <button
        onClick={handleExport}
        disabled={loading}
        className="flex items-center gap-2 px-5 py-3 rounded-xl border border-[#3F3F46] text-white text-sm font-semibold hover:border-[#A855F7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer w-fit"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {loading ? 'Exportando...' : 'Exportar datos'}
      </button>
    </Section>
  );
}

// ── Danger zone ────────────────────────────────────────────────────────────────

function DangerSection({ onLogout, token, username }) {
  const router = useRouter();
  const { addToast } = useToast();

  const [showModal,      setShowModal]      = useState(false);
  const [confirmInput,   setConfirmInput]   = useState('');
  const [password,       setPassword]       = useState('');
  const [confirmed,      setConfirmed]      = useState(false);
  const [deleting,       setDeleting]       = useState(false);
  const [deleteError,    setDeleteError]    = useState('');

  const canDelete = confirmInput === username && password.length >= 1 && confirmed;

  function openModal()  { setShowModal(true); setConfirmInput(''); setPassword(''); setConfirmed(false); setDeleteError(''); }
  function closeModal() { if (deleting) return; setShowModal(false); }

  async function handleDelete() {
    if (!canDelete) return;
    setDeleting(true); setDeleteError('');
    try {
      const res  = await fetch('/api/users/delete-account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) { setDeleteError(data.error ?? 'Error al eliminar la cuenta'); return; }
      localStorage.removeItem('token');
      setShowModal(false);
      addToast('Tu cuenta ha sido eliminada. Lamentamos verte ir.');
      setTimeout(() => router.push('/'), 1200);
    } catch {
      setDeleteError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Section title="Zona de peligro" danger>
        <p className="text-[#71717A] text-sm">Estas acciones son irreversibles. Procede con cuidado.</p>

        {/* Logout */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-red-900/40 bg-[#110808]">
          <div className="flex flex-col gap-0.5">
            <span className="text-white text-sm font-semibold">Cerrar sesión</span>
            <span className="text-[#71717A] text-xs">Cierra tu sesión en este dispositivo.</span>
          </div>
          <button onClick={onLogout} className="px-5 py-2 rounded-xl border border-red-600 text-red-400 text-sm font-semibold hover:bg-red-600 hover:text-white transition-colors cursor-pointer flex-shrink-0">
            Cerrar sesión
          </button>
        </div>

        {/* Delete account */}
        <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-red-900/40 bg-[#110808]">
          <div className="flex flex-col gap-1">
            <span className="text-white text-sm font-semibold">Eliminar mi cuenta</span>
            <span className="text-[#71717A] text-xs leading-relaxed max-w-sm">
              Esta acción es irreversible. Se eliminarán permanentemente tu perfil, reseñas, puntuaciones,
              listas, comentarios y todos tus datos. No podrás recuperarlos.
            </span>
          </div>
          <button onClick={openModal} className="flex-shrink-0 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors cursor-pointer">
            Eliminar cuenta
          </button>
        </div>
      </Section>

      {/* Confirmation modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
          onClick={closeModal}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-red-900/60 bg-[#0D0505] p-8 flex flex-col gap-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div>
                <h3 className={`${anton.className} text-white text-xl`}>Eliminar cuenta</h3>
                <p className="text-[#71717A] text-sm mt-1">Esta acción no se puede deshacer.</p>
              </div>
            </div>

            {/* Step 1: type username */}
            <div className="flex flex-col gap-2">
              <label className="text-[#9CA3AF] text-xs">
                Escribe <span className="text-white font-mono">@{username}</span> para confirmar:
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

            {/* Step 2: password */}
            <div className="flex flex-col gap-2">
              <label className="text-[#9CA3AF] text-xs">Introduce tu contraseña para confirmar:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="bg-[#111111] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white text-sm placeholder-[#3F3F46] focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>

            {/* Step 3: final confirmation checkbox */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5 flex-shrink-0">
                <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="sr-only" />
                <div className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${confirmed ? 'bg-red-600 border-red-600' : 'bg-[#111111] border-[#2A2A2A] group-hover:border-red-900'}`}>
                  {confirmed && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-[#9CA3AF] text-xs leading-relaxed">
                Entiendo que esta acción es <strong className="text-red-400">irreversible</strong> y que
                todos mis datos serán eliminados permanentemente.
              </span>
            </label>

            {deleteError && <p className="text-red-400 text-sm">{deleteError}</p>}

            {/* Actions */}
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router  = useRouter();
  const [token,    setToken]    = useState(null);
  const [username, setUsername] = useState('');
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) { router.push('/login'); return; }
    setToken(t);
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.user) { router.push('/login'); return; }
        setUsername(data.user.username);
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, []);

  function handleLogout() {
    localStorage.removeItem('token');
    router.push('/');
  }

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
        <div className="mb-10">
          <Link href={`/user/${username}`} className="text-[#71717A] hover:text-white transition-colors text-sm">
            ← Volver al perfil
          </Link>
        </div>
        <h1 className={`${anton.className} text-white text-[36px] leading-tight mb-8`}>Configuración</h1>
        <div className="flex flex-col gap-6">
          <PasswordSection    token={token} />
          <DataExportSection  token={token} />
          <DangerSection      onLogout={handleLogout} token={token} username={username} />
        </div>
      </div>
    </div>
  );
}
