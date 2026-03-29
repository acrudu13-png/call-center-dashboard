"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { LOCALE_KEY } from "@/lib/config";
import en, { type Translations } from "./en";
import ro from "./ro";

export type Locale = "en" | "ro";

const translations: Record<Locale, Translations> = { en, ro };

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translations;
}

const I18nContext = createContext<I18nContextType>({
  locale: "ro",
  setLocale: () => {},
  t: ro,
});

export function useTranslation() {
  return useContext(I18nContext);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ro");

  useEffect(() => {
    const stored = localStorage.getItem(LOCALE_KEY) as Locale | null;
    if (stored && (stored === "en" || stored === "ro")) {
      setLocaleState(stored);
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(LOCALE_KEY, l);
  }, []);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t: translations[locale] }}>
      {children}
    </I18nContext.Provider>
  );
}
