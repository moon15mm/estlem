'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
import { RefreshCw, Inbox, Bell, X } from 'lucide-react';
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

function playAlertSound() {
  if (typeof window === 'undefined') return;
  try {
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.value = 0.4;

    // Three ascending beeps
    [660, 880, 1100].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      osc.start(ctx.currentTime + i * 0.2);
      osc.stop(ctx.currentTime + i * 0.2 + 0.15);
    });

    // Long final tone
    const final = ctx.createOscillator();
    final.type = 'sine';
    final.frequency.value = 1100;
    final.connect(gain);
    final.start(ctx.currentTime + 0.7);
    final.stop(ctx.currentTime + 1.2);
  } catch {
    // AudioContext not available
  }
}

export default function OrdersPage() {
  const { storeId, staff } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<Filter>('active');
  const [loading, setLoading] = useState(true);
  const [newOrderAlert, setNewOrderAlert] = useState<Order | null>(null);
  const alertTimeoutRef = useRef<NodeJS.Timeout>();

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
      const newOrder = order as Order;
      setOrders((prev) => [newOrder, ...prev]);

      // Show big alert banner
      setNewOrderAlert(newOrder);
      if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
      alertTimeoutRef.current = setTimeout(() => setNewOrderAlert(null), 15000);

      // Play alert sound (repeated)
      playAlertSound();
      setTimeout(playAlertSound, 1500);
      setTimeout(playAlertSound, 3000);
    });

    const offStatus = onOrderStatusUpdate((update) => {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === update.orderId ? { ...o, status: update.status as OrderStatus } : o,
        ),
      );
    });

    return () => {
      offNew();
      offStatus();
      if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    };
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

  const dismissAlert = () => {
    setNewOrderAlert(null);
    if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
  };

  return (
    <div className="flex min-h-screen" dir="rtl">
      <Sidebar />
      <main className="flex-1 p-6">
        {/* New Order Alert Banner */}
        {newOrderAlert && (
          <div className="fixed top-0 left-0 right-0 z-[100] animate-in slide-in-from-top duration-300">
            <div className="bg-gradient-to-l from-emerald-600 to-emerald-500 text-white px-6 py-4 shadow-2xl">
              <div className="max-w-4xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center animate-bounce">
                    <Bell className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-xl font-black">طلب جديد!</p>
                    <p className="text-white/80 text-sm">
                      #{newOrderAlert.orderNumber} — {(newOrderAlert as any).customer?.fullName ?? 'عميل'}
                      {(newOrderAlert as any).items?.length ? ` — ${(newOrderAlert as any).items.length} منتجات` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black">
                    {new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(newOrderAlert.total)}
                  </span>
                  <button onClick={dismissAlert} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-foreground">الطلبات</h1>
            <p className="text-muted-foreground text-sm">اليوم &bull; {orders.length} طلب</p>
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
