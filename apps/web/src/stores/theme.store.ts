// apps/web/src/stores/theme.store.ts
// Theme preference (light/dark/system) — persisted to localStorage.
// Applies the theme via `data-theme` attribute on <html>.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  /** User-selected mode (light, dark, or follow system). */
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  /** Cycle: light → dark → system → light. */
  cycleMode: () => void;
}

const order: ThemeMode[] = ['light', 'dark', 'system'];

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'system',
      setMode: (mode) => set({ mode }),
      cycleMode: () => {
        const idx = order.indexOf(get().mode);
        const next = order[(idx + 1) % order.length];
        set({ mode: next });
      },
    }),
    {
      name: 'tm:theme',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/** Resolve a `ThemeMode` to a concrete `'light' | 'dark'` value, honoring system preference. */
export const resolveTheme = (mode: ThemeMode): 'light' | 'dark' => {
  if (mode === 'system') {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return mode;
};

/** Apply the resolved theme to <html data-theme="…">. */
export const applyTheme = (mode: ThemeMode) => {
  if (typeof document === 'undefined') return;
  const resolved = resolveTheme(mode);
  document.documentElement.dataset.theme = resolved;
  // Hint UA for native form controls and scrollbars.
  document.documentElement.style.colorScheme = resolved;
};
