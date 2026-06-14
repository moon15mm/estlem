'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { onOrderStatusUpdate, joinCustomerRoom, onQuoteReady } from '@/lib/socket';
import toast from 'react-hot-toast';
import { formatPrice, formatDate } from '@/lib/utils';
import { OrderStatus } from '@estlem/shared';
import type { Order } from '@estlem/shared';
import { QuoteApprovalCard } from '@/components/QuoteApprovalCard';
import { PaymentModal } from '@/components/PaymentModal';
import { useTranslation } from '@/lib/i18n/I18nProvider';

interface Props { params: { id: string } }

const STATUS_COLORS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING_PAYMENT]: 'bg-amber-100 text-amber-800',
  [OrderStatus.PENDING_QUOTE]: 'bg-amber-100 text-amber-800',
  [OrderStatus.PENDING_APPROVAL]: 'bg-blue-100 text-blue-800',
  [OrderStatus.NEW]: 'bg-blue-100 text-blue-800',
  [OrderStatus.ACCEPTED]: 'bg-indigo-100 text-indigo-800',
  [OrderStatus.PREPARING]: 'bg-amber-100 text-amber-800',
  [OrderStatus.READY]: 'bg-emerald-100 text-emerald-800',
  [OrderStatus.DELIVERED]: 'bg-green-100 text-green-800',
  [OrderStatus.CANCELLED]: 'bg-red-100 text-red-800',
};

export default function OrderTrackerPage({ params }: Props) {
  const { t, dir } = useTranslation();
  const STEPS = [
    { status: OrderStatus.NEW,       label: t('orderDetail.received'),  icon: '📥' },
    { status: OrderStatus.ACCEPTED,  label: t('orderDetail.accepted'),  icon: '✅' },
    { status: OrderStatus.PREPARING, label: t('orderDetail.preparing'), icon: '⚙️' },
    { status: OrderStatus.READY,     label: t('orderDetail.ready'),     icon: '🎉' },
    { status: OrderStatus.DELIVERED, label: t('orderDetail.delivered'), icon: '🚗' },
  ];
  const [order, setOrder] = useState<Order | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/orders/${params.id}`)
      .then((data) => setOrder(data as unknown as Order))
      .finally(() => setLoading(false));
  }, [params.id]);

  // Join the customer's realtime room once we know the customerId
  useEffect(() => {
    if (order?.customerId) {
      joinCustomerRoom(order.customerId);
    }
  }, [order?.customerId]);

  // Subscribe to live status updates
  useEffect(() => {
    const cleanup: VoidFunction = onOrderStatusUpdate((update) => {
      if (update.orderId === params.id) {
        setOrder((prev) => prev ? {
          ...prev,
          status: update.status as OrderStatus,
          estimatedMins: update.estimatedMins ?? prev.estimatedMins,
        } : prev);
      }
    });
    return cleanup;
  }, [params.id]);

  // Listen for quote ready event (store sent prices)
  useEffect(() => {
    const cleanup = onQuoteReady((data: any) => {
      if (data?.id === params.id) {
        setOrder(data as Order);
        toast.success(t('orderDetail.priceArrivedReview'), { duration: 6000, icon: '💰' });
        try {
          // Optional: play a sound
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          osc.connect(ctx.destination);
          osc.frequency.value = 880;
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
        } catch { /* ignore */ }
      }
    });
    return cleanup;
  }, [params.id]);

  // Lightweight polling fallback (every 8s) in case the socket drops
  useEffect(() => {
    const id = setInterval(() => {
      api.get(`/orders/${params.id}`)
        .then((data) => setOrder((prev) => {
          const fresh = data as unknown as Order;
          return prev && prev.status === fresh.status ? prev : fresh;
        }))
        .catch(() => {});
    }, 8000);
    return () => clearInterval(id);
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F8F8] flex items-center justify-center" dir={dir}>
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-[#EBEBEB] border-t-[#111] rounded-full animate-spin mx-auto mb-4" style={{ borderWidth: '3px' }} />
          <p className="text-sm text-[#999]">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#F8F8F8] flex items-center justify-center" dir={dir}>
        <div className="text-center px-6">
          <div className="w-16 h-16 bg-[#F5F5F5] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔍</span>
          </div>
          <p className="font-bold text-[#333]">{t('orderDetail.notFound')}</p>
        </div>
      </div>
    );
  }

  const currentIdx = STEPS.findIndex((s) => s.status === order.status);

  return (
    <div className="min-h-screen bg-[#F8F8F8] pb-8" dir={dir}>
      {/* Header */}
      <div className="bg-white border-b border-[#F0F0F0] px-4 pt-12 pb-5 animate-fade-up">
        <p className="text-[11px] text-[#AAA] tracking-widest uppercase mb-1">{t('orderDetail.orderNumber')}</p>
        <h1 className="text-2xl font-black text-[#111]">{order.orderNumber}</h1>
        <p className="text-[11px] text-[#BBB] mt-1">{formatDate(order.createdAt)}</p>
      </div>

      {/* PENDING_PAYMENT */}
      {order.status === OrderStatus.PENDING_PAYMENT && (
        <div className="px-4 pt-4">
          <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl p-5 text-center animate-fade-up">
            <div className="w-14 h-14 bg-[#F59E0B] rounded-2xl flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">💳</span>
            </div>
            <h2 className="font-black text-[#92400E] mb-1">{t('orderDetail.awaitingPayment')}</h2>
            <p className="text-xs text-[#B45309] leading-relaxed mb-4">{t('orderDetail.notSentYet')}</p>
            <button
              onClick={() => setPayOpen(true)}
              className="bg-[#111] text-white px-6 py-3 rounded-xl font-bold text-sm w-full active:scale-[0.98] transition-transform"
            >
              {t('orderDetail.payNow')}
            </button>
          </div>
        </div>
      )}

      {/* PENDING_QUOTE */}
      {order.status === OrderStatus.PENDING_QUOTE && (
        <div className="px-4 pt-4">
          <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl p-5 text-center animate-fade-up">
            <div className="w-14 h-14 bg-[#F59E0B] rounded-2xl flex items-center justify-center mx-auto mb-3 animate-pulse">
              <span className="text-2xl">⏳</span>
            </div>
            <h2 className="font-black text-[#92400E] mb-1">{t('orderDetail.storePreparingQuote')}</h2>
            <p className="text-xs text-[#B45309] leading-relaxed">
              قائمتك تحتوي على عناصر تحتاج تسعير. سيقوم المحل بإدخال الأسعار وإرسالها لك خلال دقائق للموافقة.
            </p>
          </div>
        </div>
      )}

      {/* PENDING_APPROVAL */}
      {order.status === OrderStatus.PENDING_APPROVAL && (
        <QuoteApprovalCard
          order={order}
          onApproved={() => api.get(`/orders/${params.id}`).then((d) => setOrder(d as unknown as Order))}
          onRejected={() => api.get(`/orders/${params.id}`).then((d) => setOrder(d as unknown as Order))}
        />
      )}

      <div className="p-4 space-y-3">
        {/* Status badge */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${STATUS_COLORS[order.status]}`}>
          {STEPS.find((s) => s.status === order.status)?.icon}
          {STEPS.find((s) => s.status === order.status)?.label ?? order.status}
        </div>

        {/* ETA */}
        {order.estimatedMins && order.status !== OrderStatus.DELIVERED && (
          <div className="bg-white border border-[#EBEBEB] rounded-2xl p-4 flex items-center gap-3 animate-fade-up">
            <div className="w-10 h-10 bg-[#F5F5F5] rounded-xl flex items-center justify-center shrink-0">
              <span className="text-xl">⏱️</span>
            </div>
            <div>
              <p className="text-[11px] text-[#AAA]">{t('orderDetail.estimatedTime')}</p>
              <p className="font-black text-xl text-[#111]">{order.estimatedMins} {t('orderDetail.minutes')}</p>
            </div>
          </div>
        )}

        {/* Stepper */}
        <div className="bg-white border border-[#EBEBEB] rounded-2xl p-5 animate-fade-up">
          <h2 className="font-black text-[#111] text-sm mb-4">{t('orderDetail.trackOrder')}</h2>
          <div className="relative">
            <div className="absolute right-3.5 top-4 bottom-4 w-px bg-[#F0F0F0]" />
            <div className="space-y-5">
              {STEPS.map((step, idx) => {
                const done = idx <= currentIdx;
                const active = idx === currentIdx;
                return (
                  <div key={step.status} className="flex items-center gap-4 relative">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 transition-all duration-300 ${
                      done
                        ? active ? 'bg-[#111] scale-110 shadow-sm' : 'bg-[#555]'
                        : 'bg-[#F0F0F0]'
                    }`}>
                      <span className={`text-xs ${done ? 'text-white' : 'text-[#CCC]'}`}>
                        {done ? (active ? step.icon : '✓') : '○'}
                      </span>
                    </div>
                    <p className={`text-sm font-bold transition-colors ${done ? 'text-[#111]' : 'text-[#CCC]'}`}>
                      {step.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Parking & Vehicle */}
        {(order.parkingSpot || order.vehicle) && (
          <div className="bg-white border border-[#EBEBEB] rounded-2xl p-4 space-y-3 animate-fade-up">
            {order.parkingSpot && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#F5F5F5] rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-lg">🅿️</span>
                </div>
                <div>
                  <p className="text-[11px] text-[#AAA]">{t('orderDetail.spotNumber')}</p>
                  <p className="font-bold text-[#111] text-sm">{order.parkingSpot.spotNumber}</p>
                </div>
              </div>
            )}
            {order.vehicle && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#F5F5F5] rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-lg">🚗</span>
                </div>
                <div>
                  <p className="text-[11px] text-[#AAA]">{t('orderDetail.yourCar')}</p>
                  <p className="font-bold text-[#111] text-sm">
                    {order.vehicle.color} {order.vehicle.make} {order.vehicle.model} — {order.vehicle.plateNumber}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Order items */}
        <div className="bg-white border border-[#EBEBEB] rounded-2xl p-4 animate-fade-up">
          <h3 className="font-black text-[#111] text-sm mb-3">{t('orderDetail.products')}</h3>
          <div className="space-y-2.5">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between items-center">
                <span className="text-sm text-[#555]">{item.nameArSnapshot} × {item.quantity}</span>
                <span className="text-sm font-bold text-[#111]">{formatPrice(item.priceSnapshot * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-[#F0F0F0] mt-3 pt-3 space-y-1.5">
            <div className="flex justify-between text-sm text-[#AAA]">
              <span>{t('orderDetail.subtotal')}</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between font-black text-base">
              <span className="text-[#111]">{t('orderDetail.total')}</span>
              <span className="text-[#111]">{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {payOpen && order && (
        <PaymentModal
          order={order}
          onClose={() => setPayOpen(false)}
          onSuccess={async () => {
            setPayOpen(false);
            try {
              const refreshed = await api.get(`/orders/${params.id}`) as Order;
              setOrder(refreshed);
            } catch { /* ignore */ }
          }}
        />
      )}
    </div>
  );
}
