// apps/web/src/components/ui/ThemeToggle.tsx
// Cycles light → dark → system. Icon reflects the resolved theme.

import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useThemeStore, type ThemeMode } from '../../stores/theme.store';
import { useT } from '../../lib/i18n';
import styles from './ThemeToggle.module.css';

const ICONS: Record<ThemeMode, React.ReactNode> = {
  light: <Sun size={13} />,
  dark: <Moon size={13} />,
  system: <Monitor size={13} />,
};

export const ThemeToggle: React.FC = () => {
  const mode = useThemeStore((s) => s.mode);
  const cycleMode = useThemeStore((s) => s.cycleMode);
  const t = useT();

  const labelMap: Record<ThemeMode, string> = {
    light: t.theme.light,
    dark: t.theme.dark,
    system: t.theme.system,
  };
  const aria = `${t.theme.toggle}: ${labelMap[mode]}`;

  return (
    <button
      type="button"
      className={styles.btn}
      onClick={cycleMode}
      aria-label={aria}
      title={aria}
    >
      <span className={styles.icon} aria-hidden>{ICONS[mode]}</span>
      <span className={styles.label}>{labelMap[mode]}</span>
    </button>
  );
};
