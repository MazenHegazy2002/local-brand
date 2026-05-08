'use client';

import { useLanguage } from '@/providers/LanguageContext';

export default function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { lang, setLang } = useLanguage();

  return (
    <div className={`inline-flex items-center bg-gray-100 rounded-full p-0.5 ${className}`}>
      <button
        type="button"
        onClick={() => setLang('en')}
        className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
          lang === 'en' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
        }`}
        aria-pressed={lang === 'en'}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang('ar')}
        className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
          lang === 'ar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
        }`}
        aria-pressed={lang === 'ar'}
      >
        AR
      </button>
    </div>
  );
}
