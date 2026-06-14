'use client';

import { useCallback, useEffect, useState } from 'react';
import { MapPin, Search, Loader2, Navigation, AlertCircle, Car } from 'lucide-react';
import { api } from '@/lib/api';
import { StoreCard } from '@/components/StoreCard';
import type { Store } from '@estlem/shared';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

type StoreWithDistance = Store & { distance?: number };

function StoreSkeletonList() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white border border-[#EBEBEB] rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-12 h-12 bg-[#F5F5F5] rounded-xl animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-[#F0F0F0] rounded-full w-1/2 animate-pulse" />
            <div className="h-3 bg-[#F5F5F5] rounded-full w-1/3 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DiscoverPage() {
  const { t, dir } = useTranslation();
  const [tab, setTab] = useState<'nearby' | 'search'>('nearby');
  const [nearbyStores, setNearbyStores] = useState<StoreWithDistance[]>([]);
  const [searchResults, setSearchResults] = useState<StoreWithDistance[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [locationGranted, setLocationGranted] = useState(false);

  const loadNearby = useCallback(() => {
    setLoading(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocationGranted(true);
        try {
          const data = await api.get(
            `/stores/nearby?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}&radius=10`,
          ) as StoreWithDistance[];
          setNearbyStores(data ?? []);
        } catch {
          setLocationError(t('discover.locationFailed'));
        } finally {
          setLoading(false);
        }
      },
      () => {
        setLocationError(t('discover.allowLocation'));
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  useEffect(() => {
    if (tab === 'nearby') loadNearby();
  }, [tab, loadNearby]);

  useEffect(() => {
    if (tab !== 'search' || query.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.get(`/stores/search?q=${encodeURIComponent(query)}`) as StoreWithDistance[];
        setSearchResults(data ?? []);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, tab]);

  const stores = tab === 'nearby' ? nearbyStores : searchResults;

  return (
    <div className="min-h-screen bg-[#F8F8F8]" dir={dir}>
      {/* Header */}
      <div className="bg-white border-b border-[#F0F0F0] px-5 pt-12 pb-4">
        <div className="absolute top-4 end-4 z-20">
          <LanguageSwitcher />
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-[#111] rounded-xl flex items-center justify-center">
            <Car className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-[#111]">{t('discover.title')}</h1>
            <p className="text-xs text-[#AAA]">{t('discover.subtitle')}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-[#F5F5F5] rounded-2xl p-1">
          <button
            onClick={() => setTab('nearby')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
              tab === 'nearby'
                ? 'bg-white text-[#111] shadow-sm border border-[#EBEBEB]'
                : 'text-[#999]'
            }`}
          >
            <Navigation className="h-3.5 w-3.5" />
            {t('home.nearbyShort')}
          </button>
          <button
            onClick={() => setTab('search')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
              tab === 'search'
                ? 'bg-white text-[#111] shadow-sm border border-[#EBEBEB]'
                : 'text-[#999]'
            }`}
          >
            <Search className="h-3.5 w-3.5" />
            {t('common.search')}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pt-4 pb-10">
        {/* Search Input */}
        {tab === 'search' && (
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#BBB]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('discover.searchPlaceholder')}
                className="w-full bg-white border border-[#EBEBEB] rounded-2xl pr-11 pl-4 py-3.5 text-sm text-[#111] placeholder:text-[#CCC] focus:outline-none focus:border-[#999] transition-all"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && <StoreSkeletonList />}

        {/* Location Error */}
        {!loading && locationError && tab === 'nearby' && (
          <div className="bg-white border border-[#EBEBEB] rounded-2xl p-8 text-center animate-fade-up">
            <div className="w-12 h-12 bg-[#F5F5F5] rounded-xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-5 w-5 text-[#CCC]" />
            </div>
            <h3 className="font-bold text-[#333] text-sm mb-2">{t('discover.locationTitle')}</h3>
            <p className="text-xs text-[#AAA] mb-4 leading-relaxed">{locationError}</p>
            <button
              onClick={loadNearby}
              className="bg-[#111] text-white px-6 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-transform"
            >
              {t('common.retry')}
            </button>
          </div>
        )}

        {/* Results */}
        {!loading && !locationError && stores.length > 0 && (
          <div className="space-y-2.5">
            {stores.map((store, idx) => (
              <div key={store.id} className="animate-fade-up" style={{ animationDelay: `${idx * 40}ms` }}>
                <StoreCard
                  id={store.id}
                  name={store.name}
                  nameAr={store.nameAr}
                  category={store.category}
                  address={store.address}
                  tenantId={store.tenantId}
                  distance={store.distance}
                />
              </div>
            ))}
          </div>
        )}

        {/* Empty states */}
        {!loading && !locationError && stores.length === 0 && tab === 'search' && query.length >= 2 && (
          <div className="bg-white border border-[#EBEBEB] rounded-2xl p-8 text-center animate-fade-up">
            <div className="w-12 h-12 bg-[#F5F5F5] rounded-xl flex items-center justify-center mx-auto mb-4">
              <Search className="h-5 w-5 text-[#CCC]" />
            </div>
            <h3 className="font-bold text-[#333] text-sm">{t('discover.noResults')}</h3>
            <p className="text-xs text-[#AAA] mt-1">{t('discover.tryDifferentName')}</p>
          </div>
        )}

        {!loading && !locationError && stores.length === 0 && tab === 'nearby' && locationGranted && (
          <div className="bg-white border border-[#EBEBEB] rounded-2xl p-8 text-center animate-fade-up">
            <div className="w-12 h-12 bg-[#F5F5F5] rounded-xl flex items-center justify-center mx-auto mb-4">
              <MapPin className="h-5 w-5 text-[#CCC]" />
            </div>
            <h3 className="font-bold text-[#333] text-sm">{t('discover.noNearby')}</h3>
            <p className="text-xs text-[#AAA] mt-1">{t('discover.notFoundIn10km')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
