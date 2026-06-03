'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { formatPrice, formatDate } from '@/lib/utils';
import { ArrowRight, ShoppingBag, Clock, Check, X as XIcon, Loader2 } from 'lucide-react';

interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  items?: Array<{ nameArSnapshot: string; quantity: number }>;
  store?: { nameAr: string };
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  new: { label: 'جديد', color: 'bg-blue-100 text-blue-700', icon: Clock },
  accepted: { label: 'مقبول', color: 'bg-indigo-100 text-indigo-700', icon: Clock },
  preparing: { label: 'جاري التحضير', color: 'bg-amber-100 text-amber-700', icon: Clock },
  ready: { label: 'جاهز', color: 'bg-emerald-100 text-emerald-700', icon: Check },
  delivered: { label: 'تم التسليم', color: 'bg-gray-100 text-gray-600', icon: Check },
  cancelled: { label: 'ملغي', color: 'bg-red-100 text-red-600', icon: XIcon },
};

export default function MyOrdersPage() {
  const router = useRouter();
  const { isLoggedIn } = useCustomerAuth();
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
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-white border-b border-gray-100 px-5 pt-12 pb-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-400">
            <ArrowRight className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-black text-gray-900">طلباتي</h1>
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
            <p className="font-bold text-gray-700 text-lg">لا توجد طلبات بعد</p>
            <p className="text-sm text-gray-400 mt-1 mb-6">ابدأ بالطلب من أقرب متجر</p>
            <Link href="/discover" className="bg-primary text-white px-8 py-3 rounded-2xl font-bold text-sm">
              تصفح المتاجر
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
