// apps/web/src/lib/locale.ts
// Russian locale helpers for date-fns

import { ru } from 'date-fns/locale';
import { formatDistanceToNow as _fmtDist, format as _fmt } from 'date-fns';

export const dateLocale = ru;

/** formatDistanceToNow with Russian locale, e.g. "3 дня назад" */
export function fmtDistance(date: Date | string | number): string {
  return _fmtDist(new Date(date), { addSuffix: true, locale: ru });
}

/** format with Russian locale */
export function fmtDate(date: Date | string | number, fmt: string): string {
  return _fmt(new Date(date), fmt, { locale: ru });
}
