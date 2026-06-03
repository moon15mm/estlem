'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Car, MapPin, Search, QrCode, ShoppingBag, Clock, Star, Navigation, ChevronLeft, Loader2, User, LogOut } from 'lucide-react';
import { api } from '@/lib/api';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import type { Store } from '@estlem/shared';
import toast from 'react-hot-toast';

type StoreWithDistance = Store & { distance?: number };

const CATEGORY_ICONS: Record<string, string> = {
  grocery: '🛒', pharmacy: '💊', restaurant: '🍽️', cafe: '☕',
  pet_store: '🐾', electronics: '📱', stationery: '📚', other: '🏪',
};

export default function HomePage() {
  const router = useRouter();
  const { customer, isLoggedIn, logout } = useCustomerAuth();
  const [nearbyStores, setNearbyStores] = useState<StoreWithDistance[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'granted' | 'denied'>('idle');

  useEffect(() => {
    loadNearby();
  }, []);

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
      () => {
        setLocationStatus('denied');
        setLoadingStores(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleLogout = () => {
    logout();
    toast.success('تم تسجيل الخروج');
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary via-blue-800 to-blue-900 px-5 pt-12 pb-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-40 h-40 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-60 h-60 bg-accent rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <Car className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-black text-white">استلم</span>
            </div>

            {isLoggedIn() ? (
              <div className="flex items-center gap-2">
                <Link href="/orders" className="text-white/70 text-xs bg-white/10 px-3 py-2 rounded-xl">
                  طلباتي
                </Link>
                <button onClick={handleLogout} className="text-white/50 p-2">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white text-sm font-medium px-4 py-2.5 rounded-2xl"
              >
                <User className="h-4 w-4" />
                دخول
              </Link>
            )}
          </div>

          {/* Welcome */}
          <div className="mb-6">
            {isLoggedIn() && customer?.fullName ? (
              <h1 className="text-2xl font-black text-white mb-1">أهلاً {customer.fullName}</h1>
            ) : (
              <h1 className="text-2xl font-black text-white mb-1">اطلب من سيارتك</h1>
            )}
            <p className="text-white/70 text-sm">اختر متجراً قريباً واطلب دون أن تنزل</p>
          </div>

          {/* Search bar */}
          <Link
            href="/discover?tab=search"
            className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3.5 shadow-xl"
          >
            <Search className="h-5 w-5 text-gray-400" />
            <span className="text-gray-400 text-sm flex-1">ابحث عن متجر أو منتج...</span>
          </Link>
        </div>
      </div>

      {/* Quick actions */}
      <div className="px-5 -mt-10 mb-6">
        <div className="grid grid-cols-3 gap-3">
          <Link href="/discover" className="bg-white rounded-2xl p-4 shadow-lg text-center active:scale-95 transition-transform">
            <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <MapPin className="h-6 w-6 text-accent" />
            </div>
            <p className="text-xs font-bold text-gray-800">متاجر قريبة</p>
          </Link>
          <Link href="/discover?tab=search" className="bg-white rounded-2xl p-4 shadow-lg text-center active:scale-95 transition-transform">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <Search className="h-6 w-6 text-primary" />
            </div>
            <p className="text-xs font-bold text-gray-800">بحث</p>
          </Link>
          <div className="bg-white rounded-2xl p-4 shadow-lg text-center relative">
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <QrCode className="h-6 w-6 text-amber-600" />
            </div>
            <p className="text-xs font-bold text-gray-800">مسح QR</p>
          </div>
        </div>
      </div>

      {/* Nearby stores */}
      <div className="px-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-accent" />
            <h2 className="font-black text-gray-900">متاجر قريبة منك</h2>
          </div>
          {locationStatus === 'granted' && (
            <Link href="/discover" className="text-primary text-xs font-bold flex items-center gap-0.5">
              عرض الكل <ChevronLeft className="h-3 w-3" />
            </Link>
          )}
        </div>

        {locationStatus === 'loading' || loadingStores ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
              <p className="text-sm text-gray-500">جاري تحديد موقعك...</p>
            </div>
          </div>
        ) : locationStatus === 'denied' ? (
          <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
            <MapPin className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="font-bold text-gray-700 mb-1">فعّل الموقع</p>
            <p className="text-xs text-gray-500 mb-4">اسمح بتحديد موقعك لنعرض المتاجر القريبة</p>
            <button onClick={loadNearby} className="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold">
              إعادة المحاولة
            </button>
          </div>
        ) : nearbyStores.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
            <ShoppingBag className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="font-bold text-gray-700">لا توجد متاجر قريبة</p>
            <p className="text-xs text-gray-500 mt-1">جرّب البحث بالاسم</p>
          </div>
        ) : (
          <div className="space-y-3">
            {nearbyStores.slice(0, 5).map((store) => (
              <Link
                key={store.id}
                href={`/store/${store.id}?tenantId=${store.tenantId}`}
                className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform"
              >
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center text-2xl shrink-0">
                  {store.logoUrl ? (
                    <img src={store.logoUrl} alt="" className="w-full h-full rounded-2xl object-cover" />
                  ) : (
                    CATEGORY_ICONS[store.category] ?? '🏪'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">{store.nameAr}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                      {store.category === 'grocery' ? 'بقالة' :
                       store.category === 'pharmacy' ? 'صيدلية' :
                       store.category === 'restaurant' ? 'مطعم' :
                       store.category === 'cafe' ? 'كافيه' : 'متجر'}
                    </span>
                    {store.distance !== undefined && store.distance > 0 && (
                      <span className="text-xs text-gray-400 flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" />
                        {store.distance < 1
                          ? `${Math.round(store.distance * 1000)} م`
                          : `${store.distance.toFixed(1)} كم`}
                      </span>
                    )}
                  </div>
                  {store.address && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{store.address}</p>
                  )}
                </div>
                <ChevronLeft className="h-5 w-5 text-gray-300 shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="px-5 pb-10">
        <h2 className="font-black text-gray-900 mb-4">كيف تعمل؟</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: '📍', title: 'حدد موقعك', desc: 'نعرض لك أقرب المتاجر', color: 'bg-blue-50' },
            { icon: '🛒', title: 'اختر منتجاتك', desc: 'من الكتالوج أو اكتب قائمتك', color: 'bg-emerald-50' },
            { icon: '💳', title: 'ادفع', desc: 'كاش أو مدى أو Apple Pay', color: 'bg-amber-50' },
            { icon: '🚗', title: 'استلم', desc: 'نوصّل طلبك لسيارتك', color: 'bg-purple-50' },
          ].map((step, i) => (
            <div key={i} className={`${step.color} rounded-2xl p-4`}>
              <span className="text-3xl">{step.icon}</span>
              <p className="font-bold text-gray-800 text-sm mt-2">{step.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-100 px-5 py-6 text-center">
        <p className="text-xs text-gray-400">
          هل أنت صاحب متجر؟{' '}
          <a href="https://dashboard.estlem.store/login" className="text-primary font-bold underline">
            سجّل متجرك
          </a>
        </p>
      </div>
    </div>
  );
}
