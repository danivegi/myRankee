'use client';

import { useState } from 'react';

/**
 * Follow button shared by profiles, follower lists, user search and lists.
 *
 * - "Seguir" (purple) → "Siguiendo" (outline). On hover, "Siguiendo" turns into a red
 *   "Dejar de seguir", like X / Twitch. Tailwind v4 only applies `hover:` on devices that can hover
 *   (`@media (hover: hover)`), so touch screens never get a stuck hover state.
 * - Right after a click the hover state stays off until the pointer leaves, so following someone
 *   doesn't instantly show "Dejar de seguir" under the cursor.
 * - The three labels share one grid cell: the button always has the width of the longest one, so
 *   swapping labels never moves the layout.
 */

const SIZES = {
  sm:    { button: 'px-4 py-1.5 text-xs min-h-[32px]', icon: 11 },
  md:    { button: 'px-6 py-2.5 text-sm', icon: 13 },
  block: { button: 'w-full py-2 text-sm min-h-[36px]', icon: 12 },
};

function Icon({ kind, size }) {
  return (
    <svg className="flex-shrink-0" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {kind === 'plus' && (<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>)}
      {kind === 'check' && <polyline points="20 6 9 17 4 12" />}
      {kind === 'x' && (<><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>)}
    </svg>
  );
}

// All labels sit in the same grid cell; only one is visible (`invisible` keeps its width but hides it
// from screen readers too).
const cell = 'col-start-1 row-start-1 inline-flex items-center gap-1.5 whitespace-nowrap';

export default function FollowToggleButton({
  following,
  onClick,
  disabled = false,
  size = 'md',
  followLabel = 'Seguir',
  className = '',
}) {
  const [hoverArmed, setHoverArmed] = useState(true);
  const s = SIZES[size] ?? SIZES.md;
  const armed = following && hoverArmed;

  function handleClick(event) {
    setHoverArmed(false);
    onClick?.(event);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseLeave={() => setHoverArmed(true)}
      disabled={disabled}
      className={[
        'inline-flex items-center justify-center flex-shrink-0 rounded-full border font-semibold transition-colors cursor-pointer',
        'disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A855F7]',
        s.button,
        following
          ? armed
            ? 'group/follow border-[#3F3F46] text-white hover:border-red-500 hover:text-red-400 hover:bg-red-500/10'
            : 'border-[#3F3F46] text-white'
          : 'border-[#A855F7] bg-[#A855F7] text-[#0A0A0A] hover:bg-[#9333EA] hover:border-[#9333EA]',
        className,
      ].join(' ')}
    >
      <span className="grid justify-items-center">
        <span className={`${cell} ${following ? 'invisible' : ''}`}>
          <Icon kind="plus" size={s.icon} />
          {followLabel}
        </span>
        <span className={`${cell} ${following ? (armed ? 'group-hover/follow:invisible' : '') : 'invisible'}`}>
          <Icon kind="check" size={s.icon} />
          Siguiendo
        </span>
        <span className={`${cell} ${armed ? 'invisible group-hover/follow:visible' : 'invisible'}`}>
          <Icon kind="x" size={s.icon} />
          Dejar de seguir
        </span>
      </span>
    </button>
  );
}
