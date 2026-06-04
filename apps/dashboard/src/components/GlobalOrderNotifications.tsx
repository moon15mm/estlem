'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { joinStoreRoom, onNewOrder } from '@/lib/socket';
import { OrderStatus } from '@estlem/shared';
import { Bell, X, DollarSign } from 'lucide-react';

interface OrderAlert {
  id: string;
  orderNumber: string;
  total: number;
  status?: OrderStatus;
  customer?: { fullName?: string };
  items?: Array<unknown>;
}

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

export function GlobalOrderNotifications() {
  const router = useRouter();
  const { storeId, staff } = useAuth();
  const [alert, setAlert] = useState<OrderAlert | null>(null);
  const lastAlertIdRef = useRef<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!storeId || !staff?.id) return;
    joinStoreRoom(storeId);

    const offNew = onNewOrder((order) => {
      const o = order as OrderAlert;
      // Avoid showing same alert twice (e.g., after quote approval re-emits ORDER_CREATED)
      const alertKey = `${o.id}-${o.status ?? 'new'}`;
      if (lastAlertIdRef.current === alertKey) return;
      lastAlertIdRef.current = alertKey;

      setAlert(o);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setAlert(null), 15000);

      playAlertSound();
      setTimeout(playAlertSound, 1500);
      setTimeout(playAlertSound, 3000);
    });

    return () => {
      offNew();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [storeId, staff?.id]);

  const dismiss = () => {
    setAlert(null);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const goToOrders = () => {
    dismiss();
    router.push('/orders');
  };

  if (!alert) return null;

  const isQuoteRequest = alert.status === OrderStatus.PENDING_QUOTE;

  return (
    <div className="fixed top-0 left-0 right-0 z-[200]" dir="rtl">
      <button
        onClick={goToOrders}
        className={`w-full text-white px-4 md:px-6 py-3 md:py-4 shadow-2xl flex items-center justify-between gap-3 cursor-pointer text-right ${
          isQuoteRequest
            ? 'bg-gradient-to-l from-amber-600 to-amber-500'
            : 'bg-gradient-to-l from-emerald-600 to-emerald-500'
        }`}
      >
        <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
          <div className="w-10 h-10 md:w-14 md:h-14 bg-white/20 rounded-2xl flex items-center justify-center animate-bounce shrink-0">
            {isQuoteRequest ? (
              <DollarSign className="h-5 w-5 md:h-7 md:w-7" />
            ) : (
              <Bell className="h-5 w-5 md:h-7 md:w-7" />
            )}
          </div>
          <div className="text-right min-w-0">
            <p className="text-base md:text-xl font-black">
              {isQuoteRequest ? 'طلب يحتاج تسعير!' : 'طلب جديد!'}
            </p>
            <p className="text-white/80 text-xs md:text-sm truncate">
              #{alert.orderNumber} — {alert.customer?.fullName ?? 'عميل'}
              {isQuoteRequest && ' — قائمة حرة'}
              {!isQuoteRequest && alert.items?.length ? ` — ${alert.items.length} منتجات` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          {!isQuoteRequest && (
            <span className="text-lg md:text-2xl font-black">
              {new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(alert.total)}
            </span>
          )}
          {isQuoteRequest && (
            <span className="text-xs md:text-sm font-bold bg-white/20 px-3 py-1.5 rounded-xl">
              سعّر الآن
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); dismiss(); }}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </button>
    </div>
  );
}
