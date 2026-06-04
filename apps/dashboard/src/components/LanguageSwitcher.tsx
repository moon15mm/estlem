'use client';

import { useEffect, useRef, useState } from 'react';
import { Globe } from 'lucide-react';
import { LANGUAGE_META } from '@estlem/shared';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import type { LanguageCode } from '@/lib/i18n/dictionaries';

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
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
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={
          compact
            ? 'flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15'
            : 'flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm shadow-sm hover:bg-gray-50'
        }
        aria-label={t('language.title')}
      >
        <Globe className="h-4 w-4" />
        <span className="text-base leading-none">{current?.flag}</span>
        <span className="font-medium">{current?.native}</span>
      </button>
      {open && (
        <div className="absolute end-0 top-full z-50 mt-1 min-w-[180px] overflow-hidden rounded-xl border bg-white py-1 text-gray-900 shadow-lg">
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
                  <svg
                    className="ms-auto h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
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
