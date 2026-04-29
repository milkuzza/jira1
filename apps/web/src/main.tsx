// apps/web/src/main.tsx
// Application entry point — QueryClientProvider, RouterProvider, ReactQueryDevtools.

import './styles/global.css';
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { queryClient } from './lib/queryClient';
import { router } from './lib/router';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { applyTheme, useThemeStore } from './stores/theme.store';
import { useLocaleStore } from './stores/locale.store';

/** Applies the persisted theme and reacts to system preference changes when mode is "system". */
const ThemeInit: React.FC = () => {
  const mode = useThemeStore((s) => s.mode);

  useEffect(() => {
    applyTheme(mode);
    if (mode !== 'system') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [mode]);

  return null;
};

/** First-visit locale auto-detection from browser settings. */
const LocaleInit: React.FC = () => {
  const localeDetected = useLocaleStore((s) => s.localeDetected);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const setLocaleDetected = useLocaleStore((s) => s.setLocaleDetected);

  useEffect(() => {
    if (localeDetected) return;
    const browserLocale = navigator.language?.toLowerCase() || 'en';
    const isRu = browserLocale.startsWith('ru')
      || browserLocale === 'be'
      || browserLocale === 'uk'
      || browserLocale === 'kk';
    setLocale(isRu ? 'ru' : 'en');
    setLocaleDetected(true);
  }, [localeDetected, setLocale, setLocaleDetected]);

  return null;
};

// Apply persisted theme synchronously on boot to avoid flash of light theme.
applyTheme(useThemeStore.getState().mode);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeInit />
        <LocaleInit />
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
