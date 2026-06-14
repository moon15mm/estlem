'use client';

import type { ProductCategory } from '@estlem/shared';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/I18nProvider';

interface Props {
  categories: ProductCategory[];
  active: string;
  onChange: (id: string) => void;
}

export function CategoryTabs({ categories, active, onChange }: Props) {
  const { t, lang } = useTranslation();
  const all = [
    { id: 'all', nameAr: t('category.all'), name: t('category.all') },
    ...categories,
  ];

  return (
    <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar bg-white border-b border-[#F0F0F0]">
      {all.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onChange(cat.id)}
          className={cn(
            'whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 flex-shrink-0 active:scale-95',
            active === cat.id
              ? 'bg-[#111] text-white'
              : 'bg-[#F5F5F5] text-[#555] hover:bg-[#EBEBEB]',
          )}
        >
          {lang === 'ar' ? cat.nameAr : (cat.name || cat.nameAr)}
        </button>
      ))}
    </div>
  );
}
