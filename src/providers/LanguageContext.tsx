"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { en, ar, DictKey } from "@/lib/i18n/dicts";

type LanguageContextType = {
  lang: "en" | "ar";
  t: (key: DictKey) => string;
  setLang: (lang: "en" | "ar") => void;
};

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  t: (key) => en[key] || key,
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<"en" | "ar">("en");

  useEffect(() => {
    const isArabic = document.cookie.includes("googtrans=/en/ar");
    if (isArabic) {
      setLangState("ar");
      document.documentElement.dir = "rtl";
      document.body.classList.add("font-cairo");
    } else {
      setLangState("en");
      document.documentElement.dir = "ltr";
      document.body.classList.remove("font-cairo");
    }
  }, []);

  const setLang = (l: "en" | "ar") => {
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

  const t = (key: DictKey) => {
    if (lang === "ar") return ar[key] || en[key] || key;
    return en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, t, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
