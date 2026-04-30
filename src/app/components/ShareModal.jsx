'use client';

import { useState, useEffect, useRef } from 'react';
import { toPng } from 'html-to-image';

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconClose({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconDownload({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function IconCopy({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function IconTwitter({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function IconWhatsApp({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function IconTelegram({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

// ── Hidden share card ─────────────────────────────────────────────────────────

function truncateAtWord(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.7 ? cut.slice(0, lastSpace) : cut) + '…';
}

function ShareCard({ gameName, gameCover, gameYear, gameGenre, userScore, reviewContent, username, cardRef }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const filled = userScore != null && userScore >= i;
    const half   = userScore != null && !filled && userScore >= i - 0.5;
    stars.push(
      <span key={i} style={{ fontSize: 20, color: filled || half ? '#A855F7' : '#3F3F46', lineHeight: 1 }}>
        {filled ? '★' : half ? '⬒' : '☆'}
      </span>
    );
  }

  const displayContent = reviewContent ? truncateAtWord(reviewContent, 400) : null;
  const textLen = displayContent?.length ?? 0;
  const reviewFontSize = textLen < 100 ? 24 : textLen < 250 ? 20 : 18;

  return (
    <div
      ref={cardRef}
      style={{
        width: 600, height: 600,
        backgroundColor: '#0A0A0A',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'Arial, Helvetica, sans-serif',
      }}
    >
      {/* Gradient blobs */}
      <div style={{ position: 'absolute', top: -120, left: -120, width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.28) 0%, transparent 70%)' }} />
      <div style={{ position: 'absolute', bottom: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(107,33,168,0.2) 0%, transparent 70%)' }} />

      {/* Game cover */}
      {gameCover && (
        <>
          <img
            src={gameCover} alt=""
            crossOrigin="anonymous"
            style={{ position: 'absolute', left: 0, top: 0, width: 230, height: 600, objectFit: 'cover' }}
          />
          <div style={{ position: 'absolute', left: 160, top: 0, width: 100, height: 600, background: 'linear-gradient(to right, transparent, #0A0A0A)' }} />
        </>
      )}

      {/* Right content panel — three-row flex: top (fixed), middle (fills space), footer (fixed) */}
      <div style={{
        position: 'absolute', left: gameCover ? 270 : 40, top: 0, right: 0, bottom: 0,
        padding: '36px 28px',
        boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#A855F7' }} />
          <span style={{ color: '#A855F7', fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>
            myRankee
          </span>
        </div>

        {/* Game title + meta + score — fixed height, never shrinks */}
        <div style={{ flexShrink: 0, marginTop: 20 }}>
          <h1 style={{ color: '#FFFFFF', fontSize: 22, fontWeight: 900, lineHeight: 1.2, margin: 0 }}>
            {gameName}
          </h1>

          {(gameYear || gameGenre) && (
            <p style={{ color: '#71717A', fontSize: 12, margin: '6px 0 0' }}>
              {[gameYear, gameGenre].filter(Boolean).join(' · ')}
            </p>
          )}

          {userScore != null && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 12 }}>
              <div style={{ display: 'flex', gap: 3 }}>{stars}</div>
              <span style={{ color: '#A855F7', fontSize: 30, fontWeight: 900, lineHeight: 1 }}>
                {Number(userScore).toFixed(1)}
                <span style={{ color: '#71717A', fontSize: 14, fontWeight: 400 }}> / 5</span>
              </span>
            </div>
          )}
        </div>

        {/* Review text — grows to fill all remaining space, clipped if overflow */}
        {displayContent ? (
          <p style={{
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            color: '#A0A0A0',
            fontSize: reviewFontSize,
            lineHeight: 1.55,
            margin: '16px 0 0',
            fontStyle: 'italic',
          }}>
            &ldquo;{displayContent}&rdquo;
          </p>
        ) : (
          <div style={{ flex: 1 }} />
        )}

        {/* Footer — always pinned to the bottom */}
        <div style={{ flexShrink: 0, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {username && (
            <span style={{ color: '#A855F7', fontSize: 13, fontWeight: 700 }}>@{username}</span>
          )}
          <span style={{ color: '#3F3F46', fontSize: 10 }}>myrankee.com</span>
        </div>
      </div>
    </div>
  );
}

// ── Social share button ───────────────────────────────────────────────────────

function SocialBtn({ onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-[#1A1A1A] text-white text-xs hover:bg-[#1A1A1A] transition-colors cursor-pointer"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

const TABS = ['Tarjeta', 'Enlace', 'Texto'];

export default function ShareModal({
  gameId,
  gameName,
  gameCover,
  gameYear,
  gameGenre,
  userScore,
  reviewContent,
  username,
  reviewId,
  onClose,
}) {
  const [activeTab,  setActiveTab]  = useState('Tarjeta');
  const [imgDataUrl, setImgDataUrl] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [genError,   setGenError]   = useState(false);
  const [copied,     setCopied]     = useState('');
  const cardRef = useRef(null);

  const shareUrl  = `https://myrankee.com/game/${gameId}${username ? `?ref=@${username}` : ''}`;
  const shareText = [
    `Acabo de puntuar ${gameName ?? 'este juego'} en myRankee${userScore != null ? ` con ${userScore}⭐` : ''}.`,
    reviewContent ? `"${reviewContent.slice(0, 120)}${reviewContent.length > 120 ? '…' : ''}"` : null,
    `Mira mi reseña: ${shareUrl}`,
  ].filter(Boolean).join('\n');

  // Generate image whenever Tarjeta tab is active and not yet generated
  useEffect(() => {
    if (activeTab !== 'Tarjeta' || imgDataUrl || generating) return;
    setGenerating(true);
    setGenError(false);
    const timer = setTimeout(() => {
      if (!cardRef.current) { setGenerating(false); return; }
      toPng(cardRef.current, { pixelRatio: 2, backgroundColor: '#0A0A0A', skipFonts: true })
        .then((url) => { setImgDataUrl(url); setGenerating(false); })
        .catch(() => { setGenError(true); setGenerating(false); });
    }, 350);
    return () => clearTimeout(timer);
  }, [activeTab]);

  function recordShare() {
    if (!reviewId) return;
    const token = localStorage.getItem('token');
    fetch(`/api/reviews/${reviewId}/share`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).catch(() => {});
  }

  function handleDownload() {
    if (!imgDataUrl) return;
    recordShare();
    const a = document.createElement('a');
    a.href = imgDataUrl;
    a.download = `myrankee-${(gameName ?? 'share').replace(/\s+/g, '-').toLowerCase()}.png`;
    a.click();
  }

  async function handleCopyImage() {
    if (!imgDataUrl) return;
    try {
      const blob = await (await fetch(imgDataUrl)).blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      recordShare();
      flashCopied('img');
    } catch { /* clipboard API not supported in all browsers */ }
  }

  function handleSocial(network) {
    recordShare();
    const enc = encodeURIComponent;
    const urls = {
      twitter:  `https://twitter.com/intent/tweet?text=${enc(shareText)}`,
      whatsapp: `https://wa.me/?text=${enc(`${shareText}\n${shareUrl}`)}`,
      telegram: `https://t.me/share/url?url=${enc(shareUrl)}&text=${enc(shareText)}`,
    };
    window.open(urls[network], '_blank', 'noopener,noreferrer');
  }

  function flashCopied(key) {
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(shareUrl).catch(() => {});
    flashCopied('link');
  }

  async function handleCopyText() {
    await navigator.clipboard.writeText(shareText).catch(() => {});
    flashCopied('text');
  }

  const socialBtns = [
    { key: 'twitter',  label: 'Twitter / X', Icon: IconTwitter },
    { key: 'whatsapp', label: 'WhatsApp',     Icon: IconWhatsApp },
    { key: 'telegram', label: 'Telegram',     Icon: IconTelegram },
  ];

  return (
    <>
      {/* Hidden card for image capture */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1, pointerEvents: 'none' }}>
        <ShareCard
          cardRef={cardRef}
          gameName={gameName}
          gameCover={gameCover}
          gameYear={gameYear}
          gameGenre={gameGenre}
          userScore={userScore}
          reviewContent={reviewContent}
          username={username}
        />
      </div>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-fade-in"
        style={{ backgroundColor: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(4px)' }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          className="modal-scale-in w-full max-w-md rounded-2xl border border-[#1A1A1A] flex flex-col overflow-hidden shadow-2xl"
          style={{ backgroundColor: '#111111', maxHeight: '90vh' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1A1A1A] flex-shrink-0">
            <h2 className="text-white font-semibold text-sm">Comparte tu puntuación</h2>
            <button onClick={onClose} className="text-[#71717A] hover:text-white transition-colors cursor-pointer">
              <IconClose />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#1A1A1A] flex-shrink-0">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-medium transition-colors cursor-pointer border-b-2 -mb-px ${
                  activeTab === tab ? 'text-white border-[#A855F7]' : 'text-[#71717A] border-transparent hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 scrollbar-thin">

            {/* ── Tarjeta ── */}
            {activeTab === 'Tarjeta' && (
              <div className="flex flex-col gap-4 p-5">
                {/* Preview */}
                <div
                  className="w-full rounded-xl overflow-hidden border border-[#1A1A1A] flex items-center justify-center bg-[#0A0A0A]"
                  style={{ aspectRatio: '1 / 1' }}
                >
                  {generating ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-6 h-6 rounded-full border-2 border-[#A855F7] border-t-transparent animate-spin" />
                      <p className="text-[#71717A] text-xs">Generando imagen...</p>
                    </div>
                  ) : genError ? (
                    <div className="flex flex-col items-center gap-3 p-6 text-center">
                      <p className="text-[#71717A] text-sm">No se pudo generar la imagen.</p>
                      <button
                        onClick={() => { setImgDataUrl(null); setGenError(false); }}
                        className="text-[#A855F7] text-xs hover:underline cursor-pointer"
                      >
                        Reintentar
                      </button>
                    </div>
                  ) : imgDataUrl ? (
                    <img src={imgDataUrl} alt="Share card preview" className="w-full h-full object-cover" />
                  ) : null}
                </div>

                {/* Download */}
                <button
                  onClick={handleDownload}
                  disabled={!imgDataUrl}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#A855F7] text-[#0A0A0A] text-sm font-semibold hover:bg-[#9333EA] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <IconDownload />
                  Descargar imagen
                </button>

                {/* Social grid */}
                <div className="grid grid-cols-2 gap-2">
                  {socialBtns.map(({ key, label, Icon }) => (
                    <button key={key} onClick={() => handleSocial(key)}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#1A1A1A] text-white text-xs hover:bg-[#1A1A1A] transition-colors cursor-pointer">
                      <Icon />{label}
                    </button>
                  ))}
                  <button
                    onClick={handleCopyImage}
                    disabled={!imgDataUrl}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#1A1A1A] text-white text-xs hover:bg-[#1A1A1A] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <IconCopy />
                    {copied === 'img' ? '¡Copiado!' : 'Copiar imagen'}
                  </button>
                </div>
              </div>
            )}

            {/* ── Enlace ── */}
            {activeTab === 'Enlace' && (
              <div className="flex flex-col gap-5 p-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[#71717A] text-xs font-mono">URL compartible</label>
                  <div className="flex gap-2">
                    <input
                      readOnly value={shareUrl}
                      onClick={(e) => e.target.select()}
                      className="flex-1 bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg px-3 py-2.5 text-white text-xs font-mono focus:outline-none focus:border-[#A855F7] transition-colors"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="flex-shrink-0 px-4 py-2.5 rounded-lg bg-[#A855F7] text-[#0A0A0A] text-xs font-semibold hover:bg-[#9333EA] transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {copied === 'link' ? '¡Copiado!' : 'Copiar enlace'}
                    </button>
                  </div>
                </div>

                <div className="border-t border-[#1A1A1A] pt-4 flex flex-col gap-2">
                  <p className="text-[#71717A] text-xs">Compartir en</p>
                  <div className="grid grid-cols-3 gap-2">
                    {socialBtns.map(({ key, label, Icon }) => (
                      <SocialBtn key={key} onClick={() => handleSocial(key)} icon={<Icon size={18} />} label={label} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Texto ── */}
            {activeTab === 'Texto' && (
              <div className="flex flex-col gap-5 p-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[#71717A] text-xs font-mono">Texto para compartir</label>
                  <textarea
                    readOnly value={shareText} rows={5}
                    onClick={(e) => e.target.select()}
                    className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg px-3 py-2.5 text-white text-xs leading-relaxed focus:outline-none resize-none"
                  />
                </div>
                <button
                  onClick={handleCopyText}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#A855F7] text-[#0A0A0A] text-sm font-semibold hover:bg-[#9333EA] transition-colors cursor-pointer"
                >
                  <IconCopy />
                  {copied === 'text' ? '¡Texto copiado!' : 'Copiar texto'}
                </button>
                <div className="border-t border-[#1A1A1A] pt-4 flex flex-col gap-2">
                  <p className="text-[#71717A] text-xs">Compartir directo en</p>
                  <div className="grid grid-cols-3 gap-2">
                    {socialBtns.map(({ key, label, Icon }) => (
                      <SocialBtn key={key} onClick={() => handleSocial(key)} icon={<Icon size={18} />} label={label} />
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
