'use client';

import { useCallback, useEffect, useState } from 'react';
import { MapPin, Search, Loader2, Navigation, AlertCircle, Car } from 'lucide-react';
import { api } from '@/lib/api';
import { StoreCard } from '@/components/StoreCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Store } from '@estlem/shared';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

type StoreWithDistance = Store & { distance?: number };

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
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, tab]);

  const stores = tab === 'nearby' ? nearbyStores : searchResults;

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-brand-light px-6 pt-10 pb-16 text-white relative">
        <div className="absolute top-4 end-4 z-20">
          <LanguageSwitcher />
        </div>
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur">
              <Car className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black">{t('discover.title')}</h1>
              <p className="text-sm text-white/70">{t('discover.subtitle')}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex bg-white/15 rounded-2xl p-1 mt-4">
            <button
              onClick={() => setTab('nearby')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                tab === 'nearby' ? 'bg-white text-primary shadow-lg' : 'text-white/80'
              }`}
            >
              <Navigation className="h-4 w-4" />
              {t('home.nearbyShort')}
            </button>
            <button
              onClick={() => setTab('search')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                tab === 'search' ? 'bg-white text-primary shadow-lg' : 'text-white/80'
              }`}
            >
              <Search className="h-4 w-4" />
              {t('common.search')}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 -mt-8 pb-10 max-w-2xl mx-auto">
        {/* Search Input */}
        {tab === 'search' && (
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('discover.searchPlaceholder')}
                className="h-12 pr-10 rounded-2xl shadow-lg border-0 text-base"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Location Error */}
        {!loading && locationError && tab === 'nearby' && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <h3 className="font-bold text-foreground mb-2">{t('discover.locationTitle')}</h3>
              <p className="text-sm text-muted-foreground mb-4">{locationError}</p>
              <Button onClick={loadNearby} className="gap-2">
                <MapPin className="h-4 w-4" />
                {t('common.retry')}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {!loading && !locationError && stores.length > 0 && (
          <div className="space-y-3">
            {stores.map((store) => (
              <StoreCard
                key={store.id}
                id={store.id}
                name={store.name}
                nameAr={store.nameAr}
                category={store.category}
                address={store.address}
                tenantId={store.tenantId}
                distance={store.distance}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !locationError && stores.length === 0 && (
          tab === 'search' && query.length >= 2 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8 text-center">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-bold text-foreground">{t('discover.noResults')}</h3>
                <p className="text-sm text-muted-foreground mt-2">{t('discover.tryDifferentName')}</p>
              </CardContent>
            </Card>
          ) : tab === 'nearby' && locationGranted ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8 text-center">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-bold text-foreground">{t('discover.noNearby')}</h3>
                <p className="text-sm text-muted-foreground mt-2">{t('discover.notFoundIn10km')}</p>
              </CardContent>
            </Card>
          ) : null
        )}
      </div>
    </div>
  );
}
