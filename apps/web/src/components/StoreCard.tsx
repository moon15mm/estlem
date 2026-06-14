'use client';

import Link from 'next/link';
import { Navigation, Store as StoreIcon } from 'lucide-react';
import type { StoreCategory } from '@estlem/shared';

interface StoreCardProps {
  id: string;
  name: string;
  nameAr: string;
  category: StoreCategory;
  address?: string;
  tenantId: string;
  distance?: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  grocery: 'تموينات', pharmacy: 'صيدلية', restaurant: 'مطعم',
  cafe: 'مقهى', pet_store: 'حيوانات', electronics: 'إلكترونيات',
  stationery: 'قرطاسية', other: 'أخرى',
};

export function StoreCard({ id, nameAr, category, address, tenantId, distance }: StoreCardProps) {
  return (
    <Link href={`/store/${id}?tenantId=${tenantId}`}>
      <div className="bg-white border border-[#EBEBEB] rounded-2xl p-4 flex items-center gap-3.5 active:scale-[0.98] transition-transform duration-150">
        <div className="w-12 h-12 bg-[#F5F5F5] rounded-xl flex items-center justify-center shrink-0">
          <StoreIcon className="h-5 w-5 text-[#BBB]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-[#111] text-sm truncate">{nameAr}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-[#777] bg-[#F5F5F5] border border-[#EBEBEB] px-2 py-0.5 rounded-lg font-medium">
              {CATEGORY_LABELS[category] ?? category}
            </span>
            {address && (
              <p className="text-[11px] text-[#AAA] truncate">{address}</p>
            )}
          </div>
        </div>
        {distance != null && (
          <div className="flex items-center gap-1 shrink-0">
            <Navigation className="h-3.5 w-3.5 text-[#AAA]" />
            <span className="text-xs font-bold text-[#888]">
              {distance < 1 ? `${Math.round(distance * 1000)} م` : `${distance.toFixed(1)} كم`}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
