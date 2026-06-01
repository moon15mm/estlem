'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useCart } from '@/hooks/useCart';
import { ProductCard } from '@/components/ProductCard';
import { CartDrawer } from '@/components/CartDrawer';
import { CategoryTabs } from '@/components/CategoryTabs';
import { FreeTextModal } from '@/components/FreeTextModal';
import { formatPrice } from '@/lib/utils';
import type { Product, ProductCategory, Store } from '@estlem/shared';

interface StoreClientProps {
  storeId: string;
}

export function StoreClient({ storeId }: StoreClientProps) {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get('tenantId') ?? '';

  const [spotNumber, setSpotNumber] = useState<string | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [activeCat, setActiveCat] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const { addItem, itemCount } = useCart();

  useEffect(() => {
    setSpotNumber(sessionStorage.getItem('estlem_spot_number'));
  }, []);

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32" dir="rtl">
      <div className="relative h-44 bg-gradient-to-br from-blue-900 to-blue-600">
        {store.coverUrl && (
          <Image src={store.coverUrl} alt={store.name} fill className="object-cover opacity-50" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-4 right-4 left-4 flex items-end gap-3">
          {store.logoUrl && (
            <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-white shadow-lg">
              <Image src={store.logoUrl} alt="logo" width={64} height={64} className="object-cover" />
            </div>
          )}
          <div className="text-white flex-1">
            <h1 className="text-xl font-bold">{store.nameAr}</h1>
            {spotNumber && (
              <span className="text-sm bg-white/20 px-2 py-0.5 rounded-full">
                موقف {spotNumber}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-3 bg-white sticky top-0 z-10 shadow-sm">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ابحث عن منتج..."
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 bg-gray-50"
        />
      </div>

      <CategoryTabs categories={categories} active={activeCat} onChange={setActiveCat} />

      {loading ? (
        <div className="grid grid-cols-2 gap-3 p-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="bg-white rounded-2xl h-52 animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-2">بحث</p>
          <p>لا توجد منتجات</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 p-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAdd={() => {
                addItem({
                  productId: product.id,
                  nameSnapshot: product.name,
                  nameArSnapshot: product.nameAr,
                  priceSnapshot: Number(product.salePrice ?? product.price),
                  imageUrl: product.imageUrl,
                });
                toast.success(`تمت الإضافة: ${product.nameAr}`);
              }}
            />
          ))}
        </div>
      )}

      <button
        onClick={() => setAiOpen(true)}
        className="fixed bottom-24 left-4 bg-emerald-500 text-white px-4 py-3 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium"
      >
        قائمة تسوق
      </button>

      {itemCount() > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-blue-900 text-white px-8 py-3.5 rounded-full shadow-xl flex items-center gap-3 text-sm font-bold"
        >
          <span className="bg-white text-blue-900 w-6 h-6 rounded-full text-xs flex items-center justify-center font-black">
            {itemCount()}
          </span>
          عرض السلة
          <span className="text-blue-200">{formatPrice(useCart.getState().total())}</span>
        </button>
      )}

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        storeId={storeId}
        tenantId={tenantId}
      />
      <FreeTextModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        storeId={storeId}
        tenantId={tenantId}
      />
    </div>
  );
}
