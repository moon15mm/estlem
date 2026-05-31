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
    <div className="flex gap-2 px-4 py-2 overflow-x-auto no-scrollbar bg-white border-b border-gray-100">
      {all.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onChange(cat.id)}
          className={cn(
            'whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex-shrink-0',
            active === cat.id
              ? 'bg-blue-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
          )}
        >
          {cat.nameAr}
        </button>
      ))}
    </div>
  );
}
