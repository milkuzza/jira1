// apps/web/src/components/ui/Avatar.tsx
// User avatar with image + initials fallback, multiple sizes.

import React from 'react';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

const SIZE_PX: Record<AvatarSize, number> = { xs: 20, sm: 24, md: 32, lg: 40 };
const FONT_PX: Record<AvatarSize, number> = { xs: 9,  sm: 10, md: 12, lg: 14 };

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

// Consistent color per user (based on name hash)
function avatarColor(name: string): string {
  const COLORS = [
    '#5e6ad2','#26b5ce','#f2994a','#27ae60',
    '#eb5757','#9b59b6','#f39c12','#16a085',
  ];
  if (!name) return COLORS[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return COLORS[Math.abs(h) % COLORS.length];
}

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: AvatarSize;
  className?: string;
  style?: React.CSSProperties;
}

export const Avatar: React.FC<AvatarProps> = ({ name, src, size = 'md', className, style }) => {
  const safeName = name || '?';
  const px = SIZE_PX[size];
  const fp = FONT_PX[size];
  const bg = avatarColor(safeName);

  const base: React.CSSProperties = {
    width: px,
    height: px,
    borderRadius: '50%',
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    background: bg,
    color: '#fff',
    fontSize: fp,
    fontWeight: 600,
    lineHeight: 1,
    userSelect: 'none',
    ...style,
  };

  if (src) {
    return (
      <img
        src={src}
        alt={safeName}
        width={px}
        height={px}
        className={className}
        style={{ ...base, objectFit: 'cover' }}
      />
    );
  }

  return (
    <span className={className} style={base} aria-label={safeName} title={safeName}>
      {getInitials(safeName)}
    </span>
  );
};
