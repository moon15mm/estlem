'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { formatPrice, formatDate } from '@/lib/utils';
import { ArrowRight, ShoppingBag, Clock, Check, X as XIcon, Loader2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/I18nProvider';

interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  items?: Array<{ nameArSnapshot: string; quantity: number }>;
  store?: { nameAr: string };
}

export default function MyOrdersPage() {
  const router = useRouter();
  const { isLoggedIn } = useCustomerAuth();
  const { t, dir } = useTranslation();
  const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof Clock }> = {
    new:        { label: t('order.new'),        color: 'bg-blue-100 text-blue-700',     icon: Clock },
    accepted:   { label: t('order.accepted'),   color: 'bg-indigo-100 text-indigo-700', icon: Clock },
    preparing:  { label: t('order.preparing'),  color: 'bg-amber-100 text-amber-700',   icon: Clock },
    ready:      { label: t('order.ready'),      color: 'bg-emerald-100 text-emerald-700', icon: Check },
    delivered:  { label: t('order.delivered'),  color: 'bg-gray-100 text-gray-600',     icon: Check },
    cancelled:  { label: t('order.cancelled'),  color: 'bg-red-100 text-red-600',       icon: XIcon },
  };
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace('/login');
      return;
    }
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      // This endpoint would need to be added to the API
      // For now, we show a placeholder
      setOrders([]);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50" dir={dir}>
      <div className="bg-white border-b border-gray-100 px-5 pt-12 pb-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-400">
            <ArrowRight className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-black text-gray-900">{t('ordersPage.title')}</h1>
        </div>
      </div>

      <div className="px-5 py-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag className="h-16 w-16 text-gray-200 mx-auto mb-4" />
            <p className="font-bold text-gray-700 text-lg">{t('ordersPage.empty')}</p>
            <p className="text-sm text-gray-400 mt-1 mb-6">{t('ordersPage.startFromNearby')}</p>
            <Link href="/discover" className="bg-primary text-white px-8 py-3 rounded-2xl font-bold text-sm">
              {t('home.nearbyStores')}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const status = STATUS_MAP[order.status] ?? STATUS_MAP.new;
              return (
                <Link
                  key={order.id}
                  href={`/order/${order.id}`}
                  className="block bg-white rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-gray-900">#{order.orderNumber}</span>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{formatDate(order.createdAt)}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {order.items?.length ?? 0} منتجات
                    </span>
                    <span className="font-black text-primary">{formatPrice(order.total)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
