'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { LANGUAGE_META } from '@estlem/shared';
import { dictionaries, type LanguageCode, type TranslationKey } from './dictionaries';

const STORAGE_KEY = 'estlem.lang';
const DEFAULT_LANG: LanguageCode = 'ar';

interface I18nContextValue {
  lang: LanguageCode;
  dir: 'ltr' | 'rtl';
  setLang: (l: LanguageCode) => void;
  t: (key: TranslationKey, fallback?: string) => string;
  availableLanguages: LanguageCode[];
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  children,
  initialLang,
  availableLanguages,
}: {
  children: React.ReactNode;
  /** Default language for the active store. Falls back to 'ar'. */
  initialLang?: LanguageCode;
  /** Languages the active store supports. Falls back to all 5. */
  availableLanguages?: LanguageCode[];
}) {
  const [lang, setLangState] = useState<LanguageCode>(initialLang || DEFAULT_LANG);

  // Hydrate from localStorage on mount (after SSR)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
    if (stored && dictionaries[stored]) {
      setLangState(stored);
    } else if (initialLang && dictionaries[initialLang]) {
      setLangState(initialLang);
    }
  }, [initialLang]);

  // Sync <html lang> + dir whenever language changes
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const meta = LANGUAGE_META[lang as keyof typeof LANGUAGE_META];
    if (meta) {
      document.documentElement.lang = lang;
      document.documentElement.dir = meta.dir;
    }
  }, [lang]);

  const setLang = useCallback((l: LanguageCode) => {
    if (!dictionaries[l]) return;
    setLangState(l);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, l);
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey, fallback?: string): string => {
      const dict = dictionaries[lang] || dictionaries[DEFAULT_LANG];
      const value = (dict as Record<string, string>)[key];
      if (value) return value;
      const fallbackDict = dictionaries[DEFAULT_LANG] as Record<string, string>;
      return fallbackDict[key] || fallback || key;
    },
    [lang],
  );

  const dir = LANGUAGE_META[lang as keyof typeof LANGUAGE_META]?.dir || 'ltr';

  const value: I18nContextValue = {
    lang,
    dir,
    setLang,
    t,
    availableLanguages: availableLanguages || (Object.keys(dictionaries) as LanguageCode[]),
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // SSR / no provider → return identity translator so pages don't break
    return {
      lang: DEFAULT_LANG,
      dir: 'rtl' as const,
      setLang: () => {},
      t: (key: string, fallback?: string) =>
        (dictionaries[DEFAULT_LANG] as Record<string, string>)[key] || fallback || key,
      availableLanguages: Object.keys(dictionaries) as LanguageCode[],
    };
  }
  return ctx;
}
