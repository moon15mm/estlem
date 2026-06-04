'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { Search, ShoppingBag, Sparkles, Car, UtensilsCrossed, Store as StoreIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { useCart } from '@/hooks/useCart';
import { ProductCard } from '@/components/ProductCard';
import { CartDrawer } from '@/components/CartDrawer';
import { CategoryTabs } from '@/components/CategoryTabs';
import { FreeTextModal } from '@/components/FreeTextModal';
import { WelcomeOverlay } from '@/components/WelcomeOverlay';
import { formatPrice } from '@/lib/utils';
import type { Product, ProductCategory, Store } from '@estlem/shared';

interface StoreClientProps {
  storeId: string;
}

export function StoreClient({ storeId }: StoreClientProps) {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get('tenantId') ?? '';

  const [spotNumber, setSpotNumber] = useState<string | null>(null);
  const [spotType, setSpotType] = useState<string | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [activeCat, setActiveCat] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeShown, setWelcomeShown] = useState(false);

  const { addItem, itemCount } = useCart();

  useEffect(() => {
    const num = sessionStorage.getItem('estlem_spot_number');
    const type = sessionStorage.getItem('estlem_spot_type');
    setSpotNumber(num);
    setSpotType(type);

    // Show welcome only once per session per store
    const welcomeKey = `estlem_welcome_${storeId}`;
    if (num && !sessionStorage.getItem(welcomeKey)) {
      setShowWelcome(true);
      sessionStorage.setItem(welcomeKey, '1');
    } else {
      setWelcomeShown(true);
    }
  }, [storeId]);

  useEffect(() => {
    Promise.all([
      api.get(`/stores/${storeId}`),
      api.get(`/products/store/${storeId}/categories?tenantId=${tenantId}`),
    ])
      .then(([storeData, catsData]) => {
        setStore(storeData as unknown as Store);
        setCategories(catsData as unknown as ProductCategory[]);
      })
      .catch(() => toast.error('فشل تحميل المتجر'));
  }, [storeId, tenantId]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ tenantId, limit: '100' });
      if (activeCat !== 'all') q.set('categoryId', activeCat);
      if (search) q.set('search', search);
      const data = await api.get(`/products/store/${storeId}?${q}`);
      setProducts((data as { items: Product[] }).items ?? []);
    } finally {
      setLoading(false);
    }
  }, [storeId, tenantId, activeCat, search]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  if (!store) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0F3460] via-[#1B4F72] to-[#16537E]" dir="rtl">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-[#1ABC9C] rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
        </div>
        <p className="text-white/70 text-sm mt-6 animate-pulse">جاري التحضير...</p>
      </div>
    );
  }

  const isTable = spotType === 'table';
  const displaySpotNumber = spotNumber?.replace('T:', '') ?? '';

  return (
    <>
      {showWelcome && !welcomeShown && (
        <WelcomeOverlay
          storeName={store.nameAr}
          spotNumber={spotNumber ?? ''}
          spotType={isTable ? 'table' : 'parking'}
          onDismiss={() => { setShowWelcome(false); setWelcomeShown(true); }}
        />
      )}

      <div className="min-h-screen bg-[#F8FAFC] pb-32" dir="rtl">
        {/* ── Hero Section ─────────────────────────── */}
        <div className="relative overflow-hidden">
          <div
            className="relative h-56 animate-gradient"
            style={{
              background: 'linear-gradient(135deg, #0F3460 0%, #1B4F72 35%, #16537E 70%, #1ABC9C 100%)',
              backgroundSize: '200% 200%',
            }}
          >
            {store.coverUrl && (
              <Image src={store.coverUrl} alt={store.name} fill className="object-cover opacity-30" priority />
            )}

            {/* Decorative animated orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-10 -left-10 w-48 h-48 bg-[#1ABC9C]/30 rounded-full blur-3xl animate-pulse-soft" />
              <div className="absolute -bottom-10 -right-10 w-56 h-56 bg-white/10 rounded-full blur-3xl animate-pulse-soft delay-300" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full border border-white/5 animate-rotate-slow" />
            </div>

            {/* Spot/Table indicator — top right corner */}
            {spotNumber && (
              <div className="absolute top-4 right-4 z-10 animate-slide-up-bounce">
                <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-xl border border-white/25 px-4 py-2.5 rounded-2xl shadow-lg">
                  <div className="w-7 h-7 bg-[#1ABC9C] rounded-lg flex items-center justify-center">
                    {isTable ? (
                      <UtensilsCrossed className="h-3.5 w-3.5 text-white" />
                    ) : (
                      <Car className="h-3.5 w-3.5 text-white" />
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-white/60 text-[10px] leading-tight">{isTable ? 'طاولة' : 'موقف'}</p>
                    <p className="text-white font-black text-base leading-tight">{displaySpotNumber}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Store info — bottom */}
            <div className="absolute bottom-4 right-4 left-4 flex items-end gap-3 animate-fade-up delay-200">
              <div className="relative">
                {store.logoUrl ? (
                  <div className="w-18 h-18 rounded-2xl overflow-hidden border-2 border-white shadow-2xl">
                    <Image src={store.logoUrl} alt="logo" width={72} height={72} className="object-cover" />
                  </div>
                ) : (
                  <div className="w-18 h-18 bg-white rounded-2xl flex items-center justify-center shadow-2xl">
                    <StoreIcon className="h-9 w-9 text-[#1B4F72]" />
                  </div>
                )}
                <div className="absolute -bottom-1 -left-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full" />
              </div>
              <div className="text-white flex-1 mb-1 min-w-0">
                <h1 className="text-2xl font-black drop-shadow-md truncate">{store.nameAr}</h1>
                <p className="text-white/80 text-xs mt-0.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  متاح الآن
                </p>
              </div>
            </div>
          </div>

          {/* Welcome ribbon — between hero and search */}
          <div className="bg-white px-4 py-3 flex items-center gap-2 border-b border-gray-100 animate-fade-up delay-300">
            <Sparkles className="h-4 w-4 text-[#1ABC9C]" />
            <p className="text-xs font-bold text-gray-700">
              {isTable ? 'مرحباً! اطلب من قائمتنا وسنحضر لك على الطاولة' : 'مرحباً! اطلب من قائمتنا وسنحضر لك في سيارتك'}
            </p>
          </div>
        </div>

        {/* ── Search Bar ───────────────────────────── */}
        <div className="px-4 py-4 bg-white sticky top-0 z-10 shadow-sm animate-fade-up delay-400">
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث عن منتج..."
              className="w-full border border-gray-200 rounded-2xl pr-11 pl-4 py-3 text-sm focus:outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/10 bg-gray-50 transition-all"
            />
          </div>
        </div>

        {/* ── Categories ───────────────────────────── */}
        <div className="animate-fade-up delay-500">
          <CategoryTabs categories={categories} active={activeCat} onChange={setActiveCat} />
        </div>

        {/* ── Products Grid ────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3 p-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="bg-white rounded-2xl h-52 overflow-hidden relative">
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 50%, #f3f4f6 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.5s linear infinite',
                  }}
                />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 px-6 animate-fade-up">
            <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-gray-300" />
            </div>
            <p className="font-bold text-gray-700">لا توجد منتجات</p>
            <p className="text-sm text-gray-400 mt-1">جرب البحث بكلمة أخرى</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 p-4">
            {products.map((product, idx) => (
              <div
                key={product.id}
                className="animate-fade-up"
                style={{ animationDelay: `${Math.min(idx * 50, 600)}ms` }}
              >
                <ProductCard
                  product={product}
                  onAdd={() => {
                    addItem({
                      productId: product.id,
                      nameSnapshot: product.name,
                      nameArSnapshot: product.nameAr,
                      priceSnapshot: Number(product.salePrice ?? product.price),
                      imageUrl: product.imageUrl,
                      isFreeText: false,
                    });
                    toast.success(`تمت الإضافة: ${product.nameAr}`, { icon: '🛒' });
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* ── Free Text Button (Floating Left) ──── */}
        <button
          onClick={() => setAiOpen(true)}
          className="fixed bottom-24 left-4 z-20 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white px-4 py-3 rounded-full shadow-2xl shadow-emerald-500/40 flex items-center gap-2 text-sm font-bold cursor-pointer active:scale-95 transition-transform animate-slide-up-bounce delay-700"
        >
          <Sparkles className="h-4 w-4 animate-pulse" />
          قائمة تسوق
        </button>

        {/* ── Cart Button (Floating Bottom Center) ── */}
        {itemCount() > 0 && (
          <button
            onClick={() => setCartOpen(true)}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 bg-[#1B4F72] text-white px-6 py-3.5 rounded-full shadow-2xl shadow-[#1B4F72]/40 flex items-center gap-3 text-sm font-black cursor-pointer active:scale-95 transition-transform animate-slide-up-bounce"
          >
            <div className="relative">
              <ShoppingBag className="h-5 w-5" />
              <span className="absolute -top-2 -left-2 bg-[#1ABC9C] text-white w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-black border-2 border-[#1B4F72]">
                {itemCount()}
              </span>
            </div>
            <span>عرض السلة</span>
            <span className="text-[#1ABC9C] font-black">{formatPrice(useCart.getState().total())}</span>
          </button>
        )}

        <CartDrawer
          open={cartOpen}
          onClose={() => setCartOpen(false)}
          storeId={storeId}
          tenantId={tenantId}
          allowedPayments={(store as any)?.operatingHours?.paymentMethods}
        />
        <FreeTextModal
          open={aiOpen}
          onClose={() => setAiOpen(false)}
          storeId={storeId}
          tenantId={tenantId}
        />
      </div>
    </>
  );
}
