'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { onOrderStatusUpdate, joinCustomerRoom } from '@/lib/socket';
import { formatPrice, formatDate } from '@/lib/utils';
import { OrderStatus } from '@estlem/shared';
import type { Order } from '@estlem/shared';

interface Props { params: { id: string } }

const STEPS = [
  { status: OrderStatus.NEW,       label: 'تم الاستلام',   icon: '📥' },
  { status: OrderStatus.ACCEPTED,  label: 'مقبول',         icon: '✅' },
  { status: OrderStatus.PREPARING, label: 'جاري التحضير',  icon: '⚙️' },
  { status: OrderStatus.READY,     label: 'جاهز',          icon: '🎉' },
  { status: OrderStatus.DELIVERED, label: 'تم التوصيل',    icon: '🚗' },
];

const STATUS_COLORS: Record<OrderStatus, string> = {
  [OrderStatus.NEW]: 'bg-blue-100 text-blue-800',
  [OrderStatus.ACCEPTED]: 'bg-indigo-100 text-indigo-800',
  [OrderStatus.PREPARING]: 'bg-amber-100 text-amber-800',
  [OrderStatus.READY]: 'bg-emerald-100 text-emerald-800',
  [OrderStatus.DELIVERED]: 'bg-green-100 text-green-800',
  [OrderStatus.CANCELLED]: 'bg-red-100 text-red-800',
};

export default function OrderTrackerPage({ params }: Props) {
  const [order, setOrder] = useState<Order | null>(null);
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        <div className="text-center">
          <p className="text-5xl mb-3">❓</p>
          <p>الطلب غير موجود</p>
        </div>
      </div>
    );
  }

  const currentIdx = STEPS.findIndex((s) => s.status === order.status);

  return (
    <div className="min-h-screen bg-gray-50 pb-8" dir="rtl">
      {/* Header */}
      <div className="bg-blue-900 text-white px-4 pt-12 pb-6">
        <p className="text-blue-200 text-sm mb-1">طلب رقم</p>
        <h1 className="text-2xl font-black">{order.orderNumber}</h1>
        <p className="text-blue-200 text-xs mt-1">{formatDate(order.createdAt)}</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Status badge */}
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm ${STATUS_COLORS[order.status]}`}>
          {STEPS.find((s) => s.status === order.status)?.icon}
          {STEPS.find((s) => s.status === order.status)?.label}
        </div>

        {/* ETA */}
        {order.estimatedMins && order.status !== OrderStatus.DELIVERED && (
          <div className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm">
            <span className="text-3xl">⏱️</span>
            <div>
              <p className="text-xs text-gray-400">الوقت المتوقع للتسليم</p>
              <p className="font-bold text-xl text-blue-900">{order.estimatedMins} دقيقة</p>
            </div>
          </div>
        )}

        {/* Stepper */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-700 mb-4">تتبع الطلب</h2>
          <div className="relative">
            <div className="absolute right-4 top-4 bottom-4 w-0.5 bg-gray-200" />
            <div className="space-y-6">
              {STEPS.map((step, idx) => {
                const done = idx <= currentIdx;
                const active = idx === currentIdx;
                return (
                  <div key={step.status} className="flex items-center gap-4 relative">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-all ${
                      done ? (active ? 'bg-blue-900 scale-110' : 'bg-blue-700') : 'bg-gray-200'
                    }`}>
                      <span className={`text-sm ${done ? 'text-white' : 'text-gray-400'}`}>
                        {done ? (active ? step.icon : '✓') : '○'}
                      </span>
                    </div>
                    <div>
                      <p className={`font-medium text-sm ${done ? 'text-gray-900' : 'text-gray-400'}`}>
                        {step.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Parking & Vehicle */}
        {(order.parkingSpot || order.vehicle) && (
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            {order.parkingSpot && (
              <div className="flex items-center gap-3">
                <span className="text-2xl">🅿️</span>
                <div>
                  <p className="text-xs text-gray-400">رقم الموقف</p>
                  <p className="font-bold">{order.parkingSpot.spotNumber}</p>
                </div>
              </div>
            )}
            {order.vehicle && (
              <div className="flex items-center gap-3">
                <span className="text-2xl">🚗</span>
                <div>
                  <p className="text-xs text-gray-400">سيارتك</p>
                  <p className="font-bold">
                    {order.vehicle.color} {order.vehicle.make} {order.vehicle.model}
                    {' — '}{order.vehicle.plateNumber}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Order items */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold text-gray-700 mb-3">المنتجات</h3>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-700">{item.nameArSnapshot} × {item.quantity}</span>
                <span className="font-medium">{formatPrice(item.priceSnapshot * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t mt-3 pt-3 space-y-1 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>المجموع</span><span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>ضريبة 15%</span><span>{formatPrice(order.tax)}</span>
            </div>
            <div className="flex justify-between font-black text-base pt-1">
              <span>الإجمالي</span>
              <span className="text-blue-900">{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
