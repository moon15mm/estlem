'use client';

import Link from 'next/link';
import { MapPin, Navigation, Store as StoreIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
  grocery: 'تموينات',
  pharmacy: 'صيدلية',
  restaurant: 'مطعم',
  cafe: 'مقهى',
  pet_store: 'حيوانات',
  electronics: 'إلكترونيات',
  stationery: 'قرطاسية',
  other: 'أخرى',
};

export function StoreCard({ id, nameAr, category, address, tenantId, distance }: StoreCardProps) {
  return (
    <Link href={`/store/${id}?tenantId=${tenantId}`}>
      <Card className="border hover:border-primary/40 hover:shadow-lg transition-all duration-200 active:scale-[0.98]">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
            <StoreIcon className="h-7 w-7 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground truncate">{nameAr}</h3>
            <p className="text-xs text-muted-foreground mt-1">{CATEGORY_LABELS[category] ?? category}</p>
            {address && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                {address}
              </p>
            )}
          </div>
          {distance != null && (
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <Navigation className="h-4 w-4 text-accent" />
              <span className="text-xs font-bold text-accent">
                {distance < 1 ? `${Math.round(distance * 1000)} م` : `${distance.toFixed(1)} كم`}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
