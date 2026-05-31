'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { joinStoreRoom, onNewOrder, onOrderStatusUpdate } from '@/lib/socket';
import { OrderStatus } from '@estlem/shared';
import type { Order } from '@estlem/shared';
import { OrderCard } from '@/components/OrderCard';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RefreshCw, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

type Filter = 'active' | 'all' | OrderStatus;

const FILTERS: { label: string; value: Filter }[] = [
  { label: 'النشطة', value: 'active' },
  { label: 'الكل', value: 'all' },
  { label: 'جديد', value: OrderStatus.NEW },
  { label: 'مقبول', value: OrderStatus.ACCEPTED },
  { label: 'تحضير', value: OrderStatus.PREPARING },
  { label: 'جاهز', value: OrderStatus.READY },
  { label: 'مُسلَّم', value: OrderStatus.DELIVERED },
];

export default function OrdersPage() {
  const { storeId, staff } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<Filter>('active');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!storeId || !staff?.tenantId) return;
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (filter !== 'all' && filter !== 'active') q.set('status', filter);
      const today = new Date().toISOString().split('T')[0];
      q.set('date', today);
      const data = await api.get(`/orders/store/${storeId}?${q}`) as { items: Order[] };
      let items = data.items ?? [];
      if (filter === 'active') {
        items = items.filter((o) => ![OrderStatus.DELIVERED, OrderStatus.CANCELLED].includes(o.status));
      }
      setOrders(items);
    } finally {
      setLoading(false);
    }
  }, [storeId, staff?.tenantId, filter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!storeId) return;
    joinStoreRoom(storeId);

    const offNew = onNewOrder((order) => {
      setOrders((prev) => [order as Order, ...prev]);
      toast.success('🛒 طلب جديد!', { duration: 5000 });
      // Play notification sound
      if (typeof window !== 'undefined') {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        osc.connect(ctx.destination);
        osc.frequency.value = 880;
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      }
    });

    const offStatus = onOrderStatusUpdate((update) => {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === update.orderId ? { ...o, status: update.status as OrderStatus } : o,
        ),
      );
    });

    return () => { offNew(); offStatus(); };
  }, [storeId]);

  const updateStatus = async (orderId: string, status: OrderStatus, estimatedMins?: number) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status, estimatedMins });
      setOrders((prev) =>
        prev.map((o) => o.id === orderId ? { ...o, status } : o),
      );
      toast.success('تم تحديث الحالة');
    } catch {
      toast.error('فشل التحديث');
    }
  };

  return (
    <div className="flex min-h-screen" dir="rtl">
      <Sidebar />
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-foreground">الطلبات</h1>
            <p className="text-muted-foreground text-sm">اليوم • {orders.length} طلب</p>
          </div>
          <Button variant="outline" size="sm" onClick={load} className="gap-2 text-primary">
            <RefreshCw className="h-4 w-4" /> تحديث
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto mb-6 pb-2 no-scrollbar">
          {FILTERS.map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={filter === f.value ? 'default' : 'outline'}
              onClick={() => setFilter(f.value)}
              className="whitespace-nowrap"
            >
              {f.label}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="h-52 animate-pulse bg-muted/50 border-0" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <Card className="border-dashed">
            <div className="text-center py-20 text-muted-foreground">
              <Inbox className="h-14 w-14 mx-auto mb-3 opacity-40" />
              <p className="text-lg font-medium">لا توجد طلبات</p>
            </div>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onUpdateStatus={updateStatus}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
