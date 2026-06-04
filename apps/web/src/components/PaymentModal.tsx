'use client';

import { useEffect, useState } from 'react';
import { Lock, X, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import type { Order } from '@estlem/shared';
import MoyasarCheckout from '@/components/MoyasarCheckout';

interface Props {
  order: Order;
  onClose: () => void;
  onSuccess: () => void;
}

interface CheckoutInfo {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  description: string;
  publishableKey: string;
  hasGateway: boolean;
}

export function PaymentModal({ order, onClose, onSuccess }: Props) {
  const [info, setInfo] = useState<CheckoutInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [testProcessing, setTestProcessing] = useState(false);

  useEffect(() => {
    api.get(`/payments/checkout-info/${order.id}`)
      .then((d) => setInfo(d as CheckoutInfo))
      .catch(() => toast.error('فشل تحميل بيانات الدفع'))
      .finally(() => setLoading(false));
  }, [order.id]);

  // Build callback URL — Moyasar appends &id=&status= after this
  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
  const callbackUrl = `${apiBase}/api/v1/payments/moyasar/callback?token=${encodeURIComponent(order.id)}`;

  const handleTestPayment = async () => {
    setTestProcessing(true);
    try {
      const session = await api.post('/payments/initiate', {
        orderId: order.id,
        method: order.paymentMethod,
        returnUrl: `${window.location.origin}/order/${order.id}`,
      }) as { paymentUrl?: string; testMode?: boolean; sessionId?: string };

      if (session?.sessionId) {
        await new Promise((r) => setTimeout(r, 1200));
        await api.post(`/payments/test-confirm/${session.sessionId}`, {}).catch(() => {});
        toast.success('تم الدفع بنجاح!', { icon: '✓' });
        await new Promise((r) => setTimeout(r, 500));
        onSuccess();
      } else {
        toast.error('فشل بدء الدفع التجريبي');
      }
    } catch {
      toast.error('فشل الدفع التجريبي');
    } finally {
      setTestProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4" dir="rtl">
      <div className="w-full max-w-md bg-white rounded-t-3xl md:rounded-3xl max-h-[95vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-l from-[#0F3460] to-[#1B4F72] text-white px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-black text-base">إتمام الدفع</h2>
              <p className="text-white/70 text-xs">طلب #{order.orderNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Amount */}
          <div className="bg-gradient-to-l from-[#1B4F72]/5 to-[#1ABC9C]/5 border border-[#1B4F72]/10 rounded-2xl p-4">
            <p className="text-xs text-gray-500 mb-1">المبلغ المستحق</p>
            <p className="text-2xl font-black text-[#1B4F72]">{formatPrice(Number(order.total))}</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-7 w-7 animate-spin text-[#1B4F72]" />
            </div>
          ) : !info ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center text-sm text-red-700">
              فشل تحميل بيانات الدفع — حاول مرة أخرى
            </div>
          ) : info.hasGateway ? (
            // Real Moyasar form
            <>
              <p className="text-center text-xs text-gray-500">ادفع بأمان عبر مدى، Apple Pay، أو بطاقة ائتمانية</p>
              <MoyasarCheckout
                publishableKey={info.publishableKey}
                amount={info.amount}
                currency={info.currency}
                description={info.description}
                orderId={info.orderId}
                callbackUrl={callbackUrl}
              />
            </>
          ) : (
            // No gateway configured → simulated test
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 leading-relaxed">
                  <p className="font-bold text-sm mb-1">وضع تجريبي مفعّل</p>
                  <p>صاحب المحل لم يضف مفاتيح بوابة الدفع الحقيقية بعد. الضغط على الزر سيُحاكي عملية دفع ناجحة لأغراض الاختبار.</p>
                </div>
              </div>

              <button
                onClick={handleTestPayment}
                disabled={testProcessing}
                className="w-full bg-gradient-to-l from-[#1B4F72] to-[#16537E] text-white py-4 rounded-2xl font-black text-base disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all shadow-lg shadow-[#1B4F72]/20"
              >
                {testProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    جاري المعالجة...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    محاكاة الدفع {formatPrice(Number(order.total))}
                  </>
                )}
              </button>
            </div>
          )}

          <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-400">
            <ShieldCheck className="h-3 w-3" />
            <span>دفع آمن ومشفّر عبر مياسر</span>
          </div>
        </div>
      </div>
    </div>
  );
}
