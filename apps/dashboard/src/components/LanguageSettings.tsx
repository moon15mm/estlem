'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Languages, Check, Loader2 } from 'lucide-react';
import { ALL_LANGUAGES, Language, LANGUAGE_META } from '@estlem/shared';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  storeId: string;
  initialDefault?: Language;
  initialSupported?: Language[];
}

export function LanguageSettings({ storeId, initialDefault, initialSupported }: Props) {
  const [defaultLang, setDefaultLang] = useState<Language>(initialDefault || Language.AR);
  const [supported, setSupported] = useState<Language[]>(
    initialSupported && initialSupported.length ? initialSupported : [Language.AR, Language.EN],
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialDefault) setDefaultLang(initialDefault);
    if (initialSupported?.length) setSupported(initialSupported);
  }, [initialDefault, initialSupported]);

  const toggle = (lang: Language) => {
    setSupported((current) => {
      // Can't remove the default language
      if (lang === defaultLang) return current;
      return current.includes(lang) ? current.filter((l) => l !== lang) : [...current, lang];
    });
  };

  const save = async () => {
    if (!supported.includes(defaultLang)) {
      // ensure default is always in supported list
      setSupported((s) => [...s, defaultLang]);
    }
    setSaving(true);
    try {
      await api.patch(`/stores/${storeId}/languages`, {
        defaultLanguage: defaultLang,
        supportedLanguages: Array.from(new Set([defaultLang, ...supported])),
      });
      toast.success('تم حفظ إعدادات اللغة');
    } catch {
      toast.error('فشل حفظ إعدادات اللغة');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <Languages className="h-5 w-5" />
        </div>
        <div>
          <CardTitle>لغات المتجر</CardTitle>
          <p className="mt-1 text-xs text-gray-500">
            اختر اللغات التي يستطيع العميل اختيارها واللغة الافتراضية للمتجر.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-bold">اللغة الافتراضية</label>
          <select
            value={defaultLang}
            onChange={(e) => {
              const v = e.target.value as Language;
              setDefaultLang(v);
              setSupported((s) => (s.includes(v) ? s : [...s, v]));
            }}
            className="h-11 w-full rounded-xl border bg-white px-3 text-sm"
          >
            {ALL_LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {LANGUAGE_META[l].flag} {LANGUAGE_META[l].native} ({LANGUAGE_META[l].name})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold">اللغات المدعومة</label>
          <p className="mb-3 text-xs text-gray-500">
            العميل سيرى زر تبديل اللغة بهذه اللغات فقط.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {ALL_LANGUAGES.map((l) => {
              const meta = LANGUAGE_META[l];
              const checked = supported.includes(l);
              const isDefault = l === defaultLang;
              return (
                <button
                  key={l}
                  type="button"
                  onClick={() => toggle(l)}
                  disabled={isDefault}
                  className={`flex items-center justify-between rounded-xl border p-3 text-start transition ${
                    checked
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  } ${isDefault ? 'opacity-80' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl leading-none">{meta.flag}</span>
                    <div>
                      <div className="font-bold">{meta.native}</div>
                      <div className="text-xs text-gray-500">{meta.name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isDefault && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                        افتراضي
                      </span>
                    )}
                    {checked && <Check className="h-5 w-5 text-emerald-600" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
          حفظ الإعدادات
        </Button>
      </CardContent>
    </Card>
  );
}
