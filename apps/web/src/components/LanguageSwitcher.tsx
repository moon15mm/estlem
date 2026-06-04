'use client';

import { useEffect, useRef, useState } from 'react';
import { LANGUAGE_META } from '@estlem/shared';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import type { LanguageCode } from '@/lib/i18n/dictionaries';

export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang, availableLanguages, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const current = LANGUAGE_META[lang as keyof typeof LANGUAGE_META];

  return (
    <div ref={ref} className={`relative inline-block ${className || ''}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-sm shadow-sm hover:bg-gray-50"
        aria-label={t('language.choose')}
      >
        <span className="text-lg leading-none">{current?.flag}</span>
        <span className="font-medium">{current?.native}</span>
        <svg className="h-4 w-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="absolute end-0 top-full z-50 mt-1 min-w-[180px] overflow-hidden rounded-xl border bg-white py-1 shadow-lg">
          {availableLanguages.map((code) => {
            const meta = LANGUAGE_META[code as keyof typeof LANGUAGE_META];
            if (!meta) return null;
            const active = code === lang;
            return (
              <button
                key={code}
                onClick={() => {
                  setLang(code);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 px-3 py-2 text-start text-sm hover:bg-gray-50 ${
                  active ? 'bg-emerald-50 font-bold text-emerald-700' : ''
                }`}
                dir={meta.dir}
              >
                <span className="text-lg leading-none">{meta.flag}</span>
                <span>{meta.native}</span>
                {active && (
                  <svg className="ms-auto h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default LanguageSwitcher;

// Re-export type so consumers can opt-in
export type { LanguageCode };
