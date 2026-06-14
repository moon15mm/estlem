'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { Search, ShoppingBag, Sparkles, Car, UtensilsCrossed, Store as StoreIcon, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { useCart } from '@/hooks/useCart';
import { ProductCard } from '@/components/ProductCard';
import { CartDrawer } from '@/components/CartDrawer';
import { CategoryTabs } from '@/components/CategoryTabs';
import { FreeTextModal } from '@/components/FreeTextModal';
import { WelcomeOverlay } from '@/components/WelcomeOverlay';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import { formatPrice } from '@/lib/utils';
import type { Product, ProductCategory, Store } from '@estlem/shared';

interface StoreClientProps {
  storeId: string;
}

function ProductSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-[#EBEBEB] overflow-hidden">
      <div className="h-36 bg-[#F5F5F5] animate-pulse" />
      <div className="p-3 space-y-2">
        <div className="h-3.5 bg-[#F0F0F0] rounded-full w-3/4 animate-pulse" />
        <div className="h-3 bg-[#F5F5F5] rounded-full w-1/2 animate-pulse" />
      </div>
    </div>
  );
}

export function StoreClient({ storeId }: StoreClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, dir } = useTranslation();
  const tenantId = searchParams.get('tenantId') ?? '';
  const { isLoggedIn } = useCustomerAuth();

  useEffect(() => {
    if (typeof window !== 'undefined' && !isLoggedIn()) {
      const redirect = encodeURIComponent(`/store/${storeId}?tenantId=${tenantId}`);
      router.replace(`/login?redirect=${redirect}`);
    }
  }, [isLoggedIn, router, storeId, tenantId]);

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

  useEffect(() => { loadProducts(); }, [loadProducts]);

  /* ── Loading skeleton ── */
  if (!store) {
    return (
      <div className="min-h-screen bg-[#F8F8F8]" dir={dir}>
        {/* Header skeleton */}
        <div className="bg-white border-b border-[#F0F0F0] px-4 pt-12 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[#F0F0F0] rounded-xl animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-[#F0F0F0] rounded-full w-1/2 animate-pulse" />
              <div className="h-3 bg-[#F5F5F5] rounded-full w-1/4 animate-pulse" />
            </div>
          </div>
          <div className="h-11 bg-[#F5F5F5] rounded-2xl animate-pulse" />
        </div>
        {/* Products skeleton */}
        <div className="grid grid-cols-2 gap-3 p-4">
          {Array.from({ length: 6 }).map((_, i) => <ProductSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  const isTable = spotType === 'table' || (spotNumber?.startsWith('T:') ?? false);
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

      <div className="min-h-screen bg-[#F8F8F8] pb-32" dir={dir}>

        {/* ── Store Header ───────────────────────────── */}
        <div className="bg-white border-b border-[#F0F0F0]">
          {/* Cover / logo area */}
          <div className="relative h-40 bg-[#F5F5F5] overflow-hidden">
            {store.coverUrl ? (
              <Image src={store.coverUrl} alt={store.nameAr} fill className="object-cover" priority />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <StoreIcon className="h-16 w-16 text-[#E0E0E0]" />
              </div>
            )}
            {/* Top actions */}
            <div className="absolute top-4 left-4 z-10">
              <LanguageSwitcher />
            </div>
            {spotNumber && (
              <div className="absolute top-4 right-4 z-10">
                <div className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-[#E8E8E8] px-3 py-2 rounded-xl shadow-sm">
                  <div className="w-6 h-6 bg-[#111] rounded-lg flex items-center justify-center">
                    {isTable
                      ? <UtensilsCrossed className="h-3 w-3 text-white" />
                      : <Car className="h-3 w-3 text-white" />}
                  </div>
                  <div>
                    <p className="text-[10px] text-[#999]">{isTable ? t('store.table') : t('store.parkingSpot')}</p>
                    <p className="text-sm font-black text-[#111] leading-none">{displaySpotNumber}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Store info bar */}
          <div className="px-4 py-3 flex items-center gap-3">
            {store.logoUrl ? (
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-[#EBEBEB] shrink-0 -mt-6 bg-white shadow-sm">
                <Image src={store.logoUrl} alt="logo" width={48} height={48} className="object-cover" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-[#F5F5F5] border border-[#EBEBEB] flex items-center justify-center shrink-0 -mt-6 bg-white shadow-sm">
                <StoreIcon className="h-5 w-5 text-[#CCC]" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="font-black text-[#111] text-lg leading-tight truncate">{store.nameAr}</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <span className="text-[11px] text-[#999]">{t('store.available')}</span>
              </div>
            </div>
          </div>

          {/* Spot ribbon */}
          {spotNumber && (
            <div className="mx-4 mb-3 bg-[#F8F8F8] border border-[#EBEBEB] rounded-xl px-3 py-2.5 flex items-center gap-2.5">
              <div className="w-8 h-8 bg-[#111] rounded-lg flex items-center justify-center shrink-0">
                {isTable ? <UtensilsCrossed className="h-3.5 w-3.5 text-white" /> : <Car className="h-3.5 w-3.5 text-white" />}
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-bold text-[#333]">
                  {isTable ? `${t('store.welcomeTable')} ${displaySpotNumber}` : `${t('store.welcomeParking')} ${displaySpotNumber}`}
                </p>
                <p className="text-[10px] text-[#AAA] leading-relaxed mt-0.5">
                  {isTable ? t('store.tableMessage') : t('store.parkingMessage')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Sticky Search + Categories ─────────────── */}
        <div className="sticky top-0 z-10 bg-white border-b border-[#F0F0F0]">
          <div className="px-4 pt-3 pb-0">
            <div className="relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#BBB]" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('store.searchProduct')}
                className="w-full bg-[#F5F5F5] border border-[#EBEBEB] rounded-2xl pr-11 pl-4 py-3 text-sm text-[#111] placeholder:text-[#CCC] focus:outline-none focus:border-[#999] focus:bg-white transition-all"
              />
            </div>
          </div>
          <CategoryTabs categories={categories} active={activeCat} onChange={setActiveCat} />
        </div>

        {/* ── Products Grid ──────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3 p-4">
            {Array.from({ length: 6 }).map((_, i) => <ProductSkeleton key={i} />)}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 px-6 animate-fade-up">
            <div className="w-16 h-16 bg-[#F5F5F5] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search className="h-7 w-7 text-[#CCC]" />
            </div>
            <p className="font-bold text-[#333] text-sm">{t('store.noProducts')}</p>
            <p className="text-xs text-[#AAA] mt-1">{t('store.tryDifferent')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 p-4">
            {products.map((product, idx) => (
              <div
                key={product.id}
                className="animate-fade-up"
                style={{ animationDelay: `${Math.min(idx * 40, 400)}ms` }}
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

        {/* ── Free Text Button ───────────────────────── */}
        <button
          onClick={() => setAiOpen(true)}
          className="fixed bottom-24 left-4 z-20 bg-[#111] text-white px-4 py-3 rounded-full shadow-xl flex items-center gap-2 text-sm font-bold active:scale-95 transition-transform animate-slide-up-bounce"
          style={{ animationDelay: '400ms' }}
        >
          <Sparkles className="h-4 w-4" />
          قائمة تسوق
        </button>

        {/* ── Cart Button ────────────────────────────── */}
        {itemCount() > 0 && (
          <button
            onClick={() => setCartOpen(true)}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 bg-[#111] text-white px-6 py-3.5 rounded-full shadow-2xl flex items-center gap-3 text-sm font-black active:scale-95 transition-transform animate-slide-up-bounce"
          >
            <div className="relative">
              <ShoppingBag className="h-5 w-5" />
              <span className="absolute -top-2 -left-2 bg-white text-[#111] w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-black border-2 border-[#111]">
                {itemCount()}
              </span>
            </div>
            <span>عرض السلة</span>
            <span className="text-white/60 font-black">{formatPrice(useCart.getState().total())}</span>
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
