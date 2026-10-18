// App strings use their English text as the key; ar / franco map it to the translation.
// A key missing from a dictionary falls back to English. `npm run check:i18n` lists gaps.
import { useAuth } from '@/store/auth';
import { ar, franco } from './i18n-dicts';

export type Lang = 'en' | 'ar' | 'franco';
export const LANGS: Lang[] = ['en', 'ar', 'franco'];
export const LANG_NAMES: Record<Lang, string> = { en: 'English', ar: 'عربي', franco: 'Franko' };

const dicts: Record<Lang, Record<string, string>> = { en: {}, ar, franco };

export function translate(lang: Lang, key: string, vars?: Record<string, string | number>) {
  const s = dicts[lang][key] ?? key;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;
}

export function useT() {
  const lang = useAuth(s => s.lang);
  return {
    lang,
    rtl: lang === 'ar',
    t: (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars),
  };
}

// PENDING_PAYMENT -> "Pending payment", the dictionary key for an order status.
export const statusKey = (status: string) =>
  status.charAt(0) + status.slice(1).replace(/_/g, ' ').toLowerCase();
