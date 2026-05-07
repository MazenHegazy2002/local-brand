"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { en, ar, DictKey } from "@/lib/i18n/dicts";

type Language = "en" | "ar";

type LanguageContextType = {
  lang: Language;
  t: (key: DictKey) => string;
  setLang: (lang: Language) => void;
  formatPrice: (amount: number) => string;
  formatDate: (date: Date | string) => string;
  isRTL: boolean;
};

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  t: (key) => en[key] || key,
  setLang: () => {},
  formatPrice: (amount) => `${amount.toLocaleString()} EGP`,
  formatDate: (date) => new Date(date).toLocaleDateString('en-EG'),
  isRTL: false,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");

  useEffect(() => {
    const isArabic = document.cookie.includes("googtrans=/en/ar");
    if (isArabic) {
      setLangState("ar");
    }
    document.documentElement.lang = lang;
  }, [lang]);

  const isRTL = lang === "ar";

  useEffect(() => {
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    if (isRTL) {
      document.body.classList.add("font-cairo");
    } else {
      document.body.classList.remove("font-cairo");
    }
  }, [isRTL, lang]);

  const setLang = (l: Language) => {
    setLangState(l);
    if (l === "ar") {
      document.cookie = "googtrans=/en/ar; path=/";
      document.cookie = "googtrans=/en/ar; domain=" + window.location.hostname + "; path=/";
      window.location.hash = "#googtrans(en|ar)";
    } else {
      document.cookie = "googtrans=/en/en; path=/";
      document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=" + window.location.hostname + "; path=/;";
      window.location.hash = "";
    }
    window.location.reload();
  };

  const t = (key: DictKey): string => {
    if (lang === "ar") return ar[key] || en[key] || key;
    return en[key] || key;
  };

  const formatPrice = useMemo(() => {
    return (amount: number): string => {
      const locale = lang === "ar" ? "ar-EG" : "en-EG";
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "EGP",
        minimumFractionDigits: 0,
      }).format(amount);
    };
  }, [lang]);

  const formatDate = useMemo(() => {
    return (date: Date | string): string => {
      const d = typeof date === "string" ? new Date(date) : date;
      const locale = lang === "ar" ? "ar-EG" : "en-US";
      return d.toLocaleDateString(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    };
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, t, setLang, formatPrice, formatDate, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
