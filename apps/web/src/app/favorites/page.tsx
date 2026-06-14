'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, MapPin, Store as StoreIcon, ArrowRight } from 'lucide-react';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n/I18nProvider';

interface FavoriteStore {
  id: string;
  name: string;
  nameAr?: string;
  address?: string;
  image?: string;
  rating: number;
  totalOrders: number;
  status: string;
}

export default function FavoritesPage() {
  const { customer, token } = useCustomerAuth();
  const { t, dir } = useTranslation();
  const [stores, setStores] = useState<FavoriteStore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !(customer as any)?.favoriteStores?.length) {
      setLoading(false);
      return;
    }
    Promise.all(
      (customer as any).favoriteStores.map((id: string) =>
        api.get(`/stores/${id}`).then((r: any) => r.data ?? r).catch(() => null),
      ),
    ).then((results) => {
      setStores(results.filter(Boolean) as FavoriteStore[]);
      setLoading(false);
    });
  }, [token, customer]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F8F8] flex items-center justify-center" dir={dir}>
        <div className="space-y-3 w-full px-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-[#EBEBEB] rounded-2xl p-4 flex items-center gap-3 animate-pulse">
              <div className="w-14 h-14 bg-[#F5F5F5] rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-[#F0F0F0] rounded-full w-1/2" />
                <div className="h-3 bg-[#F5F5F5] rounded-full w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F8F8]" dir={dir}>
      {/* Header */}
      <div className="bg-white border-b border-[#F0F0F0] px-5 pt-12 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-8 h-8 bg-[#F5F5F5] rounded-xl flex items-center justify-center">
            <ArrowRight className="h-4 w-4 text-[#555]" />
          </Link>
          <h1 className="text-lg font-black text-[#111]">{t('favorites.title')}</h1>
        </div>
      </div>

      <div className="px-5 py-4 pb-10">
        {stores.length === 0 ? (
          <div className="bg-white border border-[#EBEBEB] rounded-2xl p-10 text-center mt-4">
            <div className="w-14 h-14 bg-[#F5F5F5] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Heart className="h-6 w-6 text-[#CCC]" />
            </div>
            <p className="font-black text-[#111] mb-1">{t('favorites.empty')}</p>
            <p className="text-xs text-[#AAA] mb-5">{t('favorites.addForQuick')}</p>
            <Link
              href="/discover"
              className="inline-block bg-[#111] text-white px-6 py-2.5 rounded-xl font-bold text-sm"
            >
              {t('discover.title')}
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {stores.map((store, idx) => (
              <Link
                key={store.id}
                href={`/store/${store.id}`}
                className="block bg-white border border-[#EBEBEB] rounded-2xl p-4 flex items-center gap-3.5 active:scale-[0.98] transition-transform animate-fade-up"
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                <div className="w-14 h-14 bg-[#F5F5F5] rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                  {store.image ? (
                    <img src={store.image} alt={store.nameAr ?? store.name} className="w-full h-full object-cover" />
                  ) : (
                    <StoreIcon className="h-6 w-6 text-[#CCC]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-[#111] text-sm truncate">{store.nameAr ?? store.name}</p>
                  {store.address && (
                    <p className="text-[11px] text-[#AAA] flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{store.address}</span>
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      store.status === 'open'
                        ? 'bg-[#ECFDF5] text-[#065F46]'
                        : 'bg-[#FEF2F2] text-[#991B1B]'
                    }`}>
                      {store.status === 'open' ? t('favorites.open') : t('favorites.closed')}
                    </span>
                    <span className="text-[11px] text-[#BBB]">{store.totalOrders} {t('favorites.ordersCount')}</span>
                  </div>
                </div>
                <Heart className="h-5 w-5 text-[#111] fill-[#111] shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
