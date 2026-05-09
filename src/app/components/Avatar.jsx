import Image from 'next/image';

const COLORS = ['#A855F7', '#7C3AED', '#9333EA', '#6D28D9', '#8B5CF6'];

export function colorFor(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
}

export default function Avatar({ user, size = 40, className = '' }) {
  const initial = ((user?.nombre ?? user?.username ?? '?').charAt(0)).toUpperCase();
  const px = `${size}px`;

  if (user?.avatar_url) {
    return (
      <div
        className={`rounded-full overflow-hidden flex-shrink-0 relative ${className}`}
        style={{ width: px, height: px }}
      >
        <Image
          src={user.avatar_url}
          alt={user.username ?? ''}
          fill
          className="object-cover"
          sizes={px}
        />
      </div>
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 select-none ${className}`}
      style={{
        width:           px,
        height:          px,
        backgroundColor: colorFor(user?.username ?? ''),
        fontSize:        `${Math.round(size * 0.4)}px`,
      }}
    >
      {initial}
    </div>
  );
}
