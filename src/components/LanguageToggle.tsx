"use client";

import { useLanguage } from "@/providers/LanguageContext";

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <button 
      onClick={() => setLang(lang === "en" ? "ar" : "en")} 
      className="hidden sm:block text-xs font-bold uppercase mx-3 text-white/80 hover:text-white transition-colors"
      title="Translate"
    >
      {lang === "ar" ? "English" : "عربى"}
    </button>
  );
}
