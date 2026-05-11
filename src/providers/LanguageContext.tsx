"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
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
  formatDate: (date) => new Date(date).toLocaleDateString("en-EG"),
  isRTL: false,
});

const COOKIE_NAME = "googtrans";
const STORAGE_KEY = "brandy-lang";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === "undefined") return;
  const maxAge = days * 24 * 60 * 60;
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; path=/`;
  // Also set on the apex domain so iframe/subdomain widgets can read it.
  if (host && host.split(".").length > 1) {
    const apex = "." + host.split(".").slice(-2).join(".");
    document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; path=/; domain=${apex}`;
  }
}

function clearCookie(name: string) {
  if (typeof document === "undefined") return;
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  if (host && host.split(".").length > 1) {
    const apex = "." + host.split(".").slice(-2).join(".");
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${apex}`;
  }
}

function detectInitialLang(): Language {
  if (typeof window === "undefined") return "en";
  // 1) Explicit user preference saved in localStorage wins.
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "ar" || stored === "en") return stored;
  } catch {
    /* ignore */
  }
  // 2) Existing googtrans cookie (e.g. set in a previous session).
  const cookie = readCookie(COOKIE_NAME);
  if (cookie && cookie.includes("/ar")) return "ar";
  // 3) Fallback: English.
  return "en";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Use a lazy initializer so we read the cookie/localStorage exactly once
  // — and only on the client (the function is *called* in render, but the
  // helpers internally check for `window`/`document` and bail out on the
  // server, returning the default "en").
  const [lang, setLangState] = useState<Language>(() => detectInitialLang());

  const isRTL = lang === "ar";

  // Apply <html dir/lang> + body font class.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    if (isRTL) {
      document.body.classList.add("font-cairo");
    } else {
      document.body.classList.remove("font-cairo");
    }
  }, [isRTL, lang]);

  const setLang = useCallback((nextLang: Language) => {
    setLangState(nextLang);
    try {
      window.localStorage.setItem(STORAGE_KEY, nextLang);
    } catch {
      /* ignore */
    }

    if (nextLang === "ar") {
      setCookie(COOKIE_NAME, "/en/ar");
      // GT also reads a hash fragment of this exact form.
      window.location.hash = "#googtrans(en|ar)";
    } else {
      clearCookie(COOKIE_NAME);
      // Drop the GT hash so we don't keep re-translating to Arabic.
      if (window.location.hash.startsWith("#googtrans")) {
        history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    }

    // Hard reload so the GT widget can re-initialise from scratch — this is
    // the only reliable way to fully roll back a previous translation.
    window.location.reload();
  }, []);

  const t = useCallback(
    (key: DictKey): string => {
      if (lang === "ar") return ar[key] || en[key] || key;
      return en[key] || key;
    },
    [lang],
  );

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
