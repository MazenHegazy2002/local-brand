'use client';

import { Globe } from 'lucide-react';
import { useLanguage } from '@/providers/LanguageContext';

const OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
] as const;

/**
 * English / Arabic switch for the Seller Hub. The hub hides the shop navbar
 * (where the site-wide language toggle lives), so sellers switch here.
 * `tone="dark"` sits on the green sidebar, `tone="light"` on white top bars.
 */
export function SellerLanguageSwitch({
  tone = 'dark',
  className = '',
}: {
  tone?: 'dark' | 'light';
  className?: string;
}) {
  const { lang, setLang, tr } = useLanguage();
  const dark = tone === 'dark';

  return (
    <div
      role="group"
      aria-label={tr('Language')}
      className={`notranslate flex items-center gap-1 rounded-xl p-1 ${
        dark ? 'bg-white/10 border border-white/15' : 'bg-slate-100 border border-slate-200'
      } ${className}`}
    >
      <Globe
        size={14}
        aria-hidden="true"
        className={`mx-1 shrink-0 ${dark ? 'text-white/70' : 'text-slate-400'}`}
      />
      {OPTIONS.map(o => {
        const active = lang === o.code;
        return (
          <button
            key={o.code}
            type="button"
            lang={o.code}
            aria-pressed={active}
            onClick={() => {
              if (!active) setLang(o.code);
            }}
            className={`flex-1 rounded-lg px-2.5 py-1 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
              active
                ? dark
                  ? 'bg-white text-[#0f6b50] shadow-sm'
                  : 'bg-white text-slate-900 shadow-sm'
                : dark
                  ? 'text-white/80 hover:text-white hover:bg-white/10'
                  : 'text-slate-500 hover:text-slate-900'
            }`}
            style={{
              fontFamily: o.code === 'ar' ? 'var(--font-cairo), system-ui, sans-serif' : undefined,
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
