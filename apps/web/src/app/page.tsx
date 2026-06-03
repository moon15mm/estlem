'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Car, MapPin, Search, QrCode, ShoppingBag, Clock, Navigation,
  ChevronLeft, Loader2, User, LogOut, Compass, CreditCard, Package,
  ArrowLeft, Store as StoreIcon, Zap,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import type { Store } from '@estlem/shared';

type StoreWithDistance = Store & { distance?: number };

const CATEGORY_LABELS: Record<string, string> = {
  grocery: 'بقالة', pharmacy: 'صيدلية', restaurant: 'مطعم', cafe: 'كافيه',
  pet_store: 'حيوانات', electronics: 'إلكترونيات', stationery: 'مكتبة', other: 'متجر',
};

export default function HomePage() {
  const router = useRouter();
  const { customer, isLoggedIn, logout } = useCustomerAuth();
  const [nearbyStores, setNearbyStores] = useState<StoreWithDistance[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'granted' | 'denied'>('idle');

  useEffect(() => { loadNearby(); }, []);

  const loadNearby = () => {
    if (!navigator.geolocation) return;
    setLocationStatus('loading');
    setLoadingStores(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocationStatus('granted');
        try {
          const data = await api.get(
            `/stores/nearby?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}&radius=15`,
          ) as StoreWithDistance[];
          setNearbyStores(data ?? []);
        } catch { /* ignore */ }
        finally { setLoadingStores(false); }
      },
      () => { setLocationStatus('denied'); setLoadingStores(false); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]" dir="rtl">
      {/* ── Hero ────────────────────────────────────── */}
      <header className="relative bg-gradient-to-bl from-[#0F3460] via-[#1B4F72] to-[#16537E] px-5 pt-14 pb-28 overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-[#1ABC9C]/10 rounded-full blur-3xl animate-pulse-soft" />
        <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-white/5 rounded-full blur-2xl animate-pulse-soft delay-200" />

        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between mb-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10 animate-float">
              <Car className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-extrabold text-white tracking-tight">استلم</span>
          </div>

          {isLoggedIn() ? (
            <div className="flex items-center gap-2">
              <Link href="/orders" className="text-white/80 text-xs bg-white/10 backdrop-blur-sm px-3.5 py-2 rounded-xl border border-white/10 font-medium">
                طلباتي
              </Link>
              <button onClick={() => { logout(); }} className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10">
                <LogOut className="h-4 w-4 text-white/60" />
              </button>
            </div>
          ) : (
            <Link href="/login" className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm text-white text-sm font-semibold px-4 py-2.5 rounded-xl border border-white/10 active:scale-95 transition-transform">
              <User className="h-4 w-4" />
              دخول
            </Link>
          )}
        </div>

        {/* Greeting */}
        <div className="relative z-10 mb-8 animate-fade-up">
          <h1 className="text-[1.75rem] font-black text-white leading-tight mb-2">
            {isLoggedIn() && customer?.fullName ? `أهلاً ${customer.fullName}` : 'اطلب من سيارتك'}
          </h1>
          <p className="text-white/60 text-[0.9rem] leading-relaxed max-w-xs">
            اختر متجراً قريباً واستلم طلبك دون أن تنزل من سيارتك
          </p>
        </div>

        {/* Search bar — glass */}
        <Link href="/discover?tab=search" className="relative z-10 flex items-center gap-3 bg-white/10 backdrop-blur-xl rounded-2xl px-4 py-3.5 border border-white/15 active:scale-[0.98] transition-transform animate-fade-up delay-200">
          <Search className="h-5 w-5 text-white/50" />
          <span className="text-white/40 text-sm flex-1">ابحث عن متجر أو منتج...</span>
          <span className="text-[10px] text-white/30 bg-white/10 px-2 py-1 rounded-lg">بحث</span>
        </Link>
      </header>

      {/* ── Quick Actions ───────────────────────────── */}
      <section className="px-5 -mt-14 mb-8 relative z-20 animate-scale-in delay-300">
        <div className="grid grid-cols-3 gap-3">
          {[
            { href: '/discover', icon: Compass, label: 'متاجر قريبة', color: 'text-[#1ABC9C]', bg: 'bg-[#1ABC9C]/10' },
            { href: '/discover?tab=search', icon: Search, label: 'بحث', color: 'text-[#1B4F72]', bg: 'bg-[#1B4F72]/10' },
            { href: '#qr', icon: QrCode, label: 'مسح QR', color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="bg-white rounded-2xl p-4 shadow-[0_2px_20px_rgba(0,0,0,0.06)] text-center cursor-pointer active:scale-95 transition-transform"
            >
              <div className={`w-12 h-12 ${action.bg} rounded-2xl flex items-center justify-center mx-auto mb-2.5`}>
                <action.icon className={`h-5 w-5 ${action.color}`} />
              </div>
              <p className="text-xs font-bold text-gray-800">{action.label}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Nearby Stores ───────────────────────────── */}
      <section className="px-5 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#1ABC9C]/10 rounded-lg flex items-center justify-center">
              <Navigation className="h-3.5 w-3.5 text-[#1ABC9C]" />
            </div>
            <h2 className="font-extrabold text-gray-900 text-[0.95rem]">متاجر قريبة منك</h2>
          </div>
          {locationStatus === 'granted' && nearbyStores.length > 0 && (
            <Link href="/discover" className="text-[#1B4F72] text-xs font-bold flex items-center gap-0.5 cursor-pointer">
              عرض الكل <ChevronLeft className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {locationStatus === 'loading' || loadingStores ? (
          <div className="bg-white rounded-2xl p-10 shadow-[0_2px_20px_rgba(0,0,0,0.04)] text-center">
            <Loader2 className="h-7 w-7 animate-spin text-[#1B4F72] mx-auto mb-3" />
            <p className="text-sm text-gray-400 font-medium">جاري تحديد موقعك...</p>
          </div>
        ) : locationStatus === 'denied' ? (
          <div className="bg-white rounded-2xl p-8 shadow-[0_2px_20px_rgba(0,0,0,0.04)] text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MapPin className="h-6 w-6 text-gray-400" />
            </div>
            <p className="font-bold text-gray-700 mb-1 text-sm">فعّل خدمة الموقع</p>
            <p className="text-xs text-gray-400 mb-5 leading-relaxed">اسمح بتحديد موقعك لنعرض المتاجر القريبة</p>
            <button onClick={loadNearby} className="bg-[#1B4F72] text-white px-6 py-2.5 rounded-xl text-sm font-bold cursor-pointer active:scale-95 transition-transform">
              إعادة المحاولة
            </button>
          </div>
        ) : nearbyStores.length === 0 && locationStatus === 'granted' ? (
          <div className="bg-white rounded-2xl p-8 shadow-[0_2px_20px_rgba(0,0,0,0.04)] text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <StoreIcon className="h-6 w-6 text-gray-400" />
            </div>
            <p className="font-bold text-gray-700 text-sm">لا توجد متاجر قريبة</p>
            <p className="text-xs text-gray-400 mt-1">جرّب البحث بالاسم</p>
          </div>
        ) : (
          <div className="space-y-3">
            {nearbyStores.slice(0, 5).map((store, idx) => (
              <Link
                key={store.id}
                href={`/store/${store.id}?tenantId=${store.tenantId}`}
                className={`flex items-center gap-3.5 bg-white rounded-2xl p-4 shadow-[0_2px_20px_rgba(0,0,0,0.04)] cursor-pointer active:scale-[0.98] transition-transform animate-slide-right delay-${(idx + 1) * 100}`}
              >
                <div className="w-14 h-14 bg-gradient-to-br from-[#1B4F72]/5 to-[#1ABC9C]/5 rounded-2xl flex items-center justify-center shrink-0">
                  {store.logoUrl ? (
                    <img src={store.logoUrl} alt="" className="w-full h-full rounded-2xl object-cover" />
                  ) : (
                    <StoreIcon className="h-6 w-6 text-[#1B4F72]/40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-[0.9rem] truncate">{store.nameAr}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] bg-[#1B4F72]/8 text-[#1B4F72] px-2 py-0.5 rounded-md font-semibold">
                      {CATEGORY_LABELS[store.category] ?? 'متجر'}
                    </span>
                    {store.distance !== undefined && store.distance > 0 && (
                      <span className="text-[11px] text-gray-400 flex items-center gap-0.5 font-medium">
                        <MapPin className="h-3 w-3" />
                        {store.distance < 1
                          ? `${Math.round(store.distance * 1000)} م`
                          : `${store.distance.toFixed(1)} كم`}
                      </span>
                    )}
                  </div>
                  {store.address && (
                    <p className="text-[11px] text-gray-400 truncate mt-0.5">{store.address}</p>
                  )}
                </div>
                <ChevronLeft className="h-4 w-4 text-gray-300 shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── How It Works ────────────────────────────── */}
      <section className="px-5 pb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 bg-[#1B4F72]/10 rounded-lg flex items-center justify-center">
            <Zap className="h-3.5 w-3.5 text-[#1B4F72]" />
          </div>
          <h2 className="font-extrabold text-gray-900 text-[0.95rem]">كيف يعمل؟</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: MapPin, title: 'حدد موقعك', desc: 'نعرض لك أقرب المتاجر', gradient: 'from-blue-50 to-blue-100/40' },
            { icon: Package, title: 'اختر منتجاتك', desc: 'من الكتالوج أو اكتب قائمتك', gradient: 'from-emerald-50 to-emerald-100/40' },
            { icon: CreditCard, title: 'ادفع', desc: 'كاش أو مدى أو Apple Pay', gradient: 'from-amber-50 to-amber-100/40' },
            { icon: Car, title: 'استلم', desc: 'نوصّل طلبك لسيارتك', gradient: 'from-purple-50 to-purple-100/40' },
          ].map((step, i) => (
            <div key={i} className={`bg-gradient-to-br ${step.gradient} rounded-2xl p-4 animate-fade-up delay-${(i + 1) * 100}`}>
              <div className="w-10 h-10 bg-white/80 rounded-xl flex items-center justify-center mb-3 shadow-sm">
                <step.icon className="h-5 w-5 text-[#1B4F72]" />
              </div>
              <p className="font-bold text-gray-800 text-sm">{step.title}</p>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────── */}
      <footer className="bg-white border-t border-gray-100 px-5 py-6 text-center">
        <p className="text-xs text-gray-400">
          هل أنت صاحب متجر؟{' '}
          <a href="https://dashboard.estlem.store/login" className="text-[#1B4F72] font-bold underline underline-offset-2 cursor-pointer">
            سجّل متجرك
          </a>
        </p>
      </footer>
    </div>
  );
}
