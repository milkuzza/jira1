// apps/web/src/components/ui/LocaleSwitcher.tsx
// Reusable locale toggle button (RU ↔ EN). Shows target locale label.

import React from 'react';
import { Globe } from 'lucide-react';
import { useLocaleStore } from '../../stores/locale.store';

interface LocaleSwitcherProps {
  style?: React.CSSProperties;
}

export const LocaleSwitcher: React.FC<LocaleSwitcherProps> = ({ style }) => {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  const toggle = () => setLocale(locale === 'ru' ? 'en' : 'ru');

  return (
    <button
      onClick={toggle}
      aria-label={locale === 'ru' ? 'Switch to English' : 'Переключить на русский'}
      title={locale === 'ru' ? 'Switch to English' : 'Переключить на русский'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '5px 10px',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        background: 'transparent',
        color: 'var(--color-muted)',
        fontSize: 11,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'color 150ms, border-color 150ms',
        ...style,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text)';
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-accent)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-muted)';
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)';
      }}
    >
      <Globe size={12} />
      <span>{locale === 'ru' ? 'EN' : 'RU'}</span>
    </button>
  );
};
