// apps/web/src/stores/locale.store.ts
// Locale (language) preference — persisted to localStorage.
// On first visit, App.tsx auto-detects from IP; after that user controls it.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Locale = 'ru' | 'en';

interface LocaleState {
  locale: Locale;
  /** true once auto-detection has run (prevents re-running on every visit) */
  localeDetected: boolean;
  setLocale: (locale: Locale) => void;
  setLocaleDetected: (detected: boolean) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: 'en',
      localeDetected: false,
      setLocale: (locale) => set({ locale }),
      setLocaleDetected: (localeDetected) => set({ localeDetected }),
    }),
    {
      name: 'tm:locale',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
