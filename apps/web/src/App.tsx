// apps/web/src/App.tsx
// App: locale detection on first visit + router.

import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './lib/router';
import { useLocaleStore } from './stores/locale.store';

/** Runs once on first ever visit to auto-detect locale from browser settings. */
const LocaleInit: React.FC = () => {
  const localeDetected = useLocaleStore((s) => s.localeDetected);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const setLocaleDetected = useLocaleStore((s) => s.setLocaleDetected);

  useEffect(() => {
    if (localeDetected) return; // Already ran in a previous session

    const browserLocale = navigator.language?.toLowerCase() || 'en';
    const isRu = browserLocale.startsWith('ru') || browserLocale === 'be' || browserLocale === 'uk' || browserLocale === 'kk';
    
    setLocale(isRu ? 'ru' : 'en');
    setLocaleDetected(true);
  }, [localeDetected, setLocale, setLocaleDetected]);

  return null;
};

const App: React.FC = () => (
  <>
    <LocaleInit />
    <RouterProvider router={router} />
  </>
);

export default App;
