'use client';

import type { ProductCategory } from '@estlem/shared';
import { cn } from '@/lib/utils';

interface Props {
  categories: ProductCategory[];
  active: string;
  onChange: (id: string) => void;
}

export function CategoryTabs({ categories, active, onChange }: Props) {
  const all = [{ id: 'all', nameAr: 'الكل', name: 'All' }, ...categories];

  return (
    <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar bg-white border-b border-gray-100">
      {all.map((cat, idx) => (
        <button
          key={cat.id}
          onClick={() => onChange(cat.id)}
          className={cn(
            'whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all flex-shrink-0 cursor-pointer active:scale-95',
            active === cat.id
              ? 'bg-gradient-to-l from-[#1B4F72] to-[#16537E] text-white shadow-lg shadow-[#1B4F72]/25'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
          )}
          style={{ animationDelay: `${idx * 50}ms` }}
        >
          {cat.nameAr}
        </button>
      ))}
    </div>
  );
}
