'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, MapPin, Star, Store as StoreIcon } from 'lucide-react';
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
    if (!token || !customer?.favoriteStores?.length) {
      setLoading(false);
      return;
    }
    // Load each favorite store
    Promise.all(
      customer.favoriteStores.map((id: string) =>
        api.get(`/stores/${id}`).then(r => r.data).catch(() => null)
      ),
    ).then(results => {
      setStores(results.filter(Boolean));
      setLoading(false);
    });
  }, [token, customer]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6" dir={dir}>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Heart className="h-6 w-6 text-red-500 fill-red-500" />
        {t('favorites.title')}
      </h1>

      {stores.length === 0 ? (
        <div className="text-center py-16">
          <Heart className="h-16 w-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">{t('favorites.empty')}</p>
          <p className="text-gray-400 text-sm mt-2">{t('favorites.addForQuick')}</p>
          <Link href="/discover" className="inline-block mt-4 bg-emerald-500 text-white px-6 py-3 rounded-xl font-medium">
            {t('discover.title')}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {stores.map(store => (
            <Link key={store.id} href={`/store/${store.id}`}>
              <div className="bg-white rounded-2xl border p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
                <div className="w-16 h-16 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  {store.image ? (
                    <img src={store.image} alt={store.name} className="w-full h-full rounded-xl object-cover" />
                  ) : (
                    <StoreIcon className="h-8 w-8 text-emerald-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold truncate">{store.nameAr || store.name}</h3>
                  {store.address && (
                    <p className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" /> {store.address}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                      {store.rating || '—'}
                    </span>
                    <span className="text-xs text-gray-400">{store.totalOrders} {t('favorites.ordersCount')}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${store.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {store.status === 'open' ? t('favorites.open') : t('favorites.closed')}
                    </span>
                  </div>
                </div>
                <Heart className="h-5 w-5 text-red-500 fill-red-500 flex-shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
