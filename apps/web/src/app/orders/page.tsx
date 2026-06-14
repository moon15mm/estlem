'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { formatPrice, formatDate } from '@/lib/utils';
import { ArrowRight, ShoppingBag, Clock, Check, X as XIcon, Loader2, ChevronLeft } from 'lucide-react';
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

function SkeletonOrder() {
  return (
    <div className="bg-white border border-[#EBEBEB] rounded-2xl p-4 space-y-3 animate-pulse">
      <div className="flex justify-between">
        <div className="h-3.5 bg-[#F0F0F0] rounded-full w-24" />
        <div className="h-5 bg-[#F5F5F5] rounded-full w-16" />
      </div>
      <div className="h-3 bg-[#F5F5F5] rounded-full w-32" />
      <div className="flex justify-between">
        <div className="h-3 bg-[#F5F5F5] rounded-full w-16" />
        <div className="h-3.5 bg-[#F0F0F0] rounded-full w-20" />
      </div>
    </div>
  );
}

export default function MyOrdersPage() {
  const router = useRouter();
  const { isLoggedIn } = useCustomerAuth();
  const { t, dir } = useTranslation();

  const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
    new:              { label: t('order.new'),        bg: 'bg-[#EEF2FF]', text: 'text-[#4338CA]' },
    accepted:         { label: t('order.accepted'),   bg: 'bg-[#EEF2FF]', text: 'text-[#4338CA]' },
    preparing:        { label: t('order.preparing'),  bg: 'bg-[#FFFBEB]', text: 'text-[#92400E]' },
    ready:            { label: t('order.ready'),      bg: 'bg-[#ECFDF5]', text: 'text-[#065F46]' },
    delivered:        { label: t('order.delivered'),  bg: 'bg-[#F5F5F5]', text: 'text-[#555]'    },
    cancelled:        { label: t('order.cancelled'),  bg: 'bg-[#FEF2F2]', text: 'text-[#991B1B]' },
    pending_quote:    { label: 'بانتظار التسعير',     bg: 'bg-[#FFFBEB]', text: 'text-[#92400E]' },
    pending_payment:  { label: 'بانتظار الدفع',       bg: 'bg-[#FFFBEB]', text: 'text-[#92400E]' },
    pending_approval: { label: 'بانتظار موافقتك',     bg: 'bg-[#EEF2FF]', text: 'text-[#4338CA]' },
  };

  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn()) { router.replace('/login'); return; }
    api.get('/orders/my')
      .then((d) => setOrders((d as unknown as OrderSummary[]) ?? []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F8F8]" dir={dir}>
      {/* Header */}
      <div className="bg-white border-b border-[#F0F0F0] px-5 pt-12 pb-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-8 h-8 bg-[#F5F5F5] rounded-xl flex items-center justify-center">
            <ArrowRight className="h-4 w-4 text-[#555]" />
          </Link>
          <h1 className="text-lg font-black text-[#111]">{t('ordersPage.title')}</h1>
        </div>
      </div>

      <div className="px-5 py-4 pb-10">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <SkeletonOrder key={i} />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white border border-[#EBEBEB] rounded-2xl p-10 text-center mt-4">
            <div className="w-14 h-14 bg-[#F5F5F5] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="h-6 w-6 text-[#CCC]" />
            </div>
            <p className="font-black text-[#111] mb-1">{t('ordersPage.empty')}</p>
            <p className="text-xs text-[#AAA] mb-5">{t('ordersPage.startFromNearby')}</p>
            <Link
              href="/discover"
              className="inline-block bg-[#111] text-white px-6 py-2.5 rounded-xl font-bold text-sm"
            >
              {t('home.nearbyStores')}
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {orders.map((order, idx) => {
              const status = STATUS_MAP[order.status.toLowerCase()] ?? STATUS_MAP.new;
              return (
                <Link
                  key={order.id}
                  href={`/order/${order.id}`}
                  className="block bg-white border border-[#EBEBEB] rounded-2xl p-4 active:scale-[0.98] transition-transform animate-fade-up"
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-[#111] text-sm">#{order.orderNumber}</span>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${status.bg} ${status.text}`}>
                      {status.label}
                    </span>
                  </div>
                  {order.store?.nameAr && (
                    <p className="text-xs text-[#999] mb-1">{order.store.nameAr}</p>
                  )}
                  <p className="text-[11px] text-[#BBB] mb-3">{formatDate(order.createdAt)}</p>
                  <div className="flex items-center justify-between border-t border-[#F5F5F5] pt-2.5">
                    <span className="text-xs text-[#999]">{order.items?.length ?? 0} منتجات</span>
                    <span className="font-black text-[#111] text-sm">{formatPrice(order.total)}</span>
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
