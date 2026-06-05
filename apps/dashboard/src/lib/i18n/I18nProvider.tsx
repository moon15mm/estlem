'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { LANGUAGE_META } from '@estlem/shared';
import { dictionaries, type LanguageCode, type TranslationKey } from './dictionaries';

const STORAGE_KEY = 'estlem.dashboard.lang';
const DEFAULT_LANG: LanguageCode = 'ar';

interface I18nContextValue {
  lang: LanguageCode;
  dir: 'ltr' | 'rtl';
  setLang: (l: LanguageCode) => void;
  t: (key: TranslationKey, fallback?: string) => string;
  availableLanguages: LanguageCode[];
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LanguageCode>(DEFAULT_LANG);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
    if (stored && dictionaries[stored]) setLangState(stored);
  }, []);

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
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const t = useCallback(
    (key: TranslationKey, fallback?: string): string => {
      const dict = (dictionaries[lang] || dictionaries[DEFAULT_LANG]) as Record<string, string>;
      const value = dict[key];
      if (value) return value;
      const fb = dictionaries[DEFAULT_LANG] as Record<string, string>;
      return fb[key] || fallback || key;
    },
    [lang],
  );

  const dir = LANGUAGE_META[lang as keyof typeof LANGUAGE_META]?.dir || 'ltr';

  return (
    <I18nContext.Provider
      value={{
        lang,
        dir,
        setLang,
        t,
        availableLanguages: Object.keys(dictionaries) as LanguageCode[],
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
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
