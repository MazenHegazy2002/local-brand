'use client';

import { useLanguage } from '@/providers/LanguageContext';

const CYCLE = { en: 'ar', ar: 'fk', fk: 'en' } as const;
const LABEL = { en: 'EN', ar: 'عربي', fk: 'Franko' };
const TITLE = { en: 'Switch to Arabic', ar: 'Switch to Franko', fk: 'Switch to English' };

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <button
      type="button"
      onClick={() => setLang(CYCLE[lang])}
      title={TITLE[lang]}
      aria-label={TITLE[lang]}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border border-white/30 bg-white/10 hover:bg-white/20 text-white transition-colors notranslate"
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 8l6 6 6-6" />
      </svg>
      {LABEL[lang]}
    </button>
  );
}
