'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Car, MapPin, Search, QrCode, Navigation,
  ChevronLeft, Loader2, User, LogOut, Compass,
  CreditCard, Package, Store as StoreIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import type { Store } from '@estlem/shared';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useTranslation } from '@/lib/i18n/I18nProvider';

type StoreWithDistance = Store & { distance?: number };

const CATEGORY_LABELS: Record<string, string> = {
  grocery: 'بقالة', pharmacy: 'صيدلية', restaurant: 'مطعم', cafe: 'كافيه',
  pet_store: 'حيوانات', electronics: 'إلكترونيات', stationery: 'مكتبة', other: 'متجر',
};

function SkeletonStore() {
  return (
    <div className="flex items-center gap-3.5 bg-white rounded-2xl p-4 border border-[#F0F0F0]">
      <div className="w-12 h-12 bg-[#F0F0F0] rounded-xl shrink-0 animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-[#F0F0F0] rounded-full w-2/3 animate-pulse" />
        <div className="h-3 bg-[#F5F5F5] rounded-full w-1/3 animate-pulse" />
      </div>
    </div>
  );
}

export default function HomePage() {
  const { customer, isLoggedIn, logout } = useCustomerAuth();
  const { t, dir } = useTranslation();
  const [nearbyStores, setNearbyStores] = useState<StoreWithDistance[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'granted' | 'denied'>('idle');

  useEffect(() => { loadNearby(); }, []);

  const loadAllStores = async () => {
    try {
      const all = (await api.get(`/stores/active?limit=20`)) as StoreWithDistance[];
      setNearbyStores(all ?? []);
    } catch { /* ignore */ }
  };

  const loadNearby = () => {
    if (!navigator.geolocation) {
      setLocationStatus('denied');
      setLoadingStores(true);
      loadAllStores().finally(() => setLoadingStores(false));
      return;
    }
    setLocationStatus('loading');
    setLoadingStores(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocationStatus('granted');
        try {
          const data = (await api.get(
            `/stores/nearby?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}&radius=50`,
          )) as StoreWithDistance[];
          if (data && data.length > 0) {
            setNearbyStores(data);
          } else {
            await loadAllStores();
          }
        } catch {
          await loadAllStores();
        } finally { setLoadingStores(false); }
      },
      async () => {
        setLocationStatus('denied');
        await loadAllStores();
        setLoadingStores(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="min-h-screen bg-[#F8F8F8]" dir={dir}>

      {/* ── Header ─────────────────────────────────── */}
      <header className="bg-white px-5 pt-12 pb-4 border-b border-[#F0F0F0]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-[#111] rounded-xl flex items-center justify-center">
              <Car className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-black text-[#111] tracking-tight">{t('app.name')}</span>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            {isLoggedIn() ? (
              <>
                <Link
                  href="/orders"
                  className="text-[#111] text-xs bg-[#F5F5F5] px-3 py-2 rounded-xl font-semibold border border-[#EBEBEB]"
                >
                  {t('home.myOrders')}
                </Link>
                <button
                  onClick={() => logout()}
                  className="w-9 h-9 rounded-xl bg-[#F5F5F5] border border-[#EBEBEB] flex items-center justify-center"
                >
                  <LogOut className="h-4 w-4 text-[#999]" />
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 bg-[#111] text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl active:scale-95 transition-transform"
              >
                <User className="h-3.5 w-3.5" />
                {t('home.signIn')}
              </Link>
            )}
          </div>
        </div>

        {/* Greeting */}
        <div className="mb-4 animate-fade-up">
          <h1 className="text-xl font-black text-[#111] leading-tight">
            {isLoggedIn() && customer?.fullName
              ? `${t('home.welcomeBack')} ${customer.fullName} 👋`
              : t('app.tagline')}
          </h1>
          <p className="text-sm text-[#999] mt-1">{t('home.heroSubtitle')}</p>
        </div>

        {/* Search */}
        <Link
          href="/discover?tab=search"
          className="flex items-center gap-3 bg-[#F5F5F5] rounded-2xl px-4 py-3.5 border border-[#EBEBEB] active:scale-[0.98] transition-transform animate-fade-up"
          style={{ animationDelay: '100ms' }}
        >
          <Search className="h-4 w-4 text-[#AAA]" />
          <span className="text-[#BBB] text-sm flex-1">{t('home.searchPlaceholder')}</span>
          <span className="text-[10px] text-[#CCC] bg-white border border-[#E8E8E8] px-2 py-1 rounded-lg">
            {t('common.search')}
          </span>
        </Link>
      </header>

      {/* ── Quick Actions ────────────────────────────── */}
      <section className="px-5 pt-5 mb-6 animate-fade-up" style={{ animationDelay: '150ms' }}>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { href: '/discover', icon: Compass, label: t('home.nearbyShort') },
            { href: '/discover?tab=search', icon: Search, label: t('common.search') },
            { href: '#qr', icon: QrCode, label: t('home.scanQr') },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="bg-white rounded-2xl p-3.5 border border-[#EBEBEB] flex flex-col items-center gap-2 active:scale-95 transition-transform"
            >
              <div className="w-10 h-10 bg-[#F5F5F5] rounded-xl flex items-center justify-center">
                <action.icon className="h-4.5 w-4.5 text-[#333]" />
              </div>
              <p className="text-[11px] font-bold text-[#333]">{action.label}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Nearby Stores ────────────────────────────── */}
      <section className="px-5 mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black text-[#111] text-[0.95rem]">{t('home.nearbyStores')}</h2>
          {locationStatus === 'granted' && nearbyStores.length > 0 && (
            <Link href="/discover" className="text-[#888] text-xs font-medium flex items-center gap-0.5">
              {t('home.viewAll')} <ChevronLeft className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {loadingStores ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <SkeletonStore key={i} />)}
          </div>
        ) : locationStatus === 'denied' && nearbyStores.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-[#EBEBEB] text-center">
            <div className="w-12 h-12 bg-[#F5F5F5] rounded-xl flex items-center justify-center mx-auto mb-3">
              <MapPin className="h-5 w-5 text-[#CCC]" />
            </div>
            <p className="font-bold text-[#333] text-sm mb-1">{t('home.enableLocation')}</p>
            <p className="text-xs text-[#999] mb-4 leading-relaxed">{t('home.enableLocationDesc')}</p>
            <button
              onClick={loadNearby}
              className="bg-[#111] text-white px-6 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-transform"
            >
              {t('common.retry')}
            </button>
          </div>
        ) : nearbyStores.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-[#EBEBEB] text-center">
            <div className="w-12 h-12 bg-[#F5F5F5] rounded-xl flex items-center justify-center mx-auto mb-3">
              <StoreIcon className="h-5 w-5 text-[#CCC]" />
            </div>
            <p className="font-bold text-[#333] text-sm">{t('home.noStores')}</p>
            <p className="text-xs text-[#999] mt-1">{t('home.tryByName')}</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {nearbyStores.slice(0, 5).map((store, idx) => (
              <Link
                key={store.id}
                href={`/store/${store.id}?tenantId=${store.tenantId}`}
                className="flex items-center gap-3.5 bg-white rounded-2xl p-4 border border-[#EBEBEB] active:scale-[0.98] transition-transform animate-fade-up"
                style={{ animationDelay: `${(idx + 1) * 60}ms` }}
              >
                <div className="w-12 h-12 bg-[#F5F5F5] rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                  {store.logoUrl ? (
                    <img src={store.logoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <StoreIcon className="h-5 w-5 text-[#BBB]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#111] text-sm truncate">{store.nameAr}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] bg-[#F5F5F5] text-[#666] px-2 py-0.5 rounded-lg font-medium border border-[#EBEBEB]">
                      {CATEGORY_LABELS[store.category] ?? 'متجر'}
                    </span>
                    {store.distance !== undefined && store.distance > 0 && (
                      <span className="text-[11px] text-[#999] flex items-center gap-0.5">
                        <Navigation className="h-2.5 w-2.5" />
                        {store.distance < 1
                          ? `${Math.round(store.distance * 1000)} م`
                          : `${store.distance.toFixed(1)} كم`}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronLeft className="h-4 w-4 text-[#DDD] shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── How It Works ─────────────────────────────── */}
      <section className="px-5 pb-8">
        <h2 className="font-black text-[#111] text-[0.95rem] mb-3">كيف يعمل؟</h2>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { num: '01', icon: MapPin, title: 'حدد موقعك', desc: 'نعرض لك أقرب المتاجر' },
            { num: '02', icon: Package, title: 'اختر منتجاتك', desc: 'من الكتالوج أو اكتب قائمتك' },
            { num: '03', icon: CreditCard, title: 'ادفع', desc: 'كاش أو مدى أو Apple Pay' },
            { num: '04', icon: Car, title: 'استلم', desc: 'نوصّل طلبك لسيارتك' },
          ].map((step, i) => (
            <div
              key={step.num}
              className="bg-white rounded-2xl p-4 border border-[#EBEBEB] animate-fade-up"
              style={{ animationDelay: `${(i + 1) * 60}ms` }}
            >
              <span className="text-[10px] font-black text-[#CCC] tracking-widest mb-2 block">{step.num}</span>
              <div className="w-9 h-9 bg-[#F5F5F5] rounded-xl flex items-center justify-center mb-2.5">
                <step.icon className="h-4 w-4 text-[#444]" />
              </div>
              <p className="font-bold text-[#111] text-sm">{step.title}</p>
              <p className="text-[11px] text-[#999] mt-0.5 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────── */}
      <footer className="bg-white border-t border-[#F0F0F0] px-5 py-6 text-center">
        <p className="text-xs text-[#AAA]">
          هل أنت صاحب متجر؟{' '}
          <a
            href="https://dashboard.estlem.store/login"
            className="text-[#111] font-bold underline underline-offset-2"
          >
            سجّل متجرك
          </a>
        </p>
      </footer>
    </div>
  );
}
