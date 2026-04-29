// apps/web/src/components/ui/Spinner.tsx
// CSS-animated spinner in sm/md/lg sizes.

import React from 'react';

type Size = 'sm' | 'md' | 'lg';

const SIZES: Record<Size, number> = { sm: 14, md: 20, lg: 32 };
const STROKES: Record<Size, number> = { sm: 2, md: 2.5, lg: 3 };

interface SpinnerProps {
  size?: Size;
  color?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', color = 'currentColor' }) => {
  const s = SIZES[size];
  const stroke = STROKES[size];
  const r = (s - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;

  return (
    <svg
      width={s}
      height={s}
      viewBox={`0 0 ${s} ${s}`}
      fill="none"
      aria-label="Loading"
      role="status"
      style={{ animation: 'spin 0.7s linear infinite', flexShrink: 0 }}
    >
      <circle
        cx={s / 2}
        cy={s / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        strokeOpacity={0.2}
      />
      <circle
        cx={s / 2}
        cy={s / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={circ * 0.75}
        strokeLinecap="round"
      />
    </svg>
  );
};
