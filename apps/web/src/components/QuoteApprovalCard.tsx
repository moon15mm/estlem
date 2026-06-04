'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, DollarSign, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { PaymentMethod } from '@estlem/shared';
import type { Order } from '@estlem/shared';
import { formatPrice } from '@/lib/utils';

interface Props {
  order: Order & { items?: any[] };
  onApproved: () => void;
  onRejected: () => void;
  allowedPayments?: Record<string, boolean>;
}

export function QuoteApprovalCard({ order, onApproved, onRejected, allowedPayments }: Props) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState('');

  const approve = async () => {
    setLoading('approve');
    try {
      await api.post(`/orders/${order.id}/approve-quote`, { paymentMethod });
      toast.success('تم تأكيد الطلب بنجاح');
      onApproved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'فشل تأكيد الطلب');
    } finally {
      setLoading(null);
    }
  };

  const reject = async () => {
    setLoading('reject');
    try {
      await api.post(`/orders/${order.id}/reject-quote`, { reason: reason || undefined });
      toast.success('تم إلغاء الطلب');
      onRejected();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'فشل الإلغاء');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="px-4 py-6">
      <div className="bg-gradient-to-br from-blue-50 to-emerald-50 border-2 border-blue-200 rounded-3xl p-5 shadow-lg animate-slide-up-bounce">
        {/* Header */}
        <div className="text-center mb-5">
          <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-3 animate-glow-pulse">
            <DollarSign className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-lg font-black text-gray-900 mb-1">السعر النهائي جاهز</h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            قام المحل بتسعير عناصر القائمة الحرة. راجع الأسعار ووافق لبدء التحضير.
          </p>
        </div>

        {/* Items breakdown */}
        <div className="bg-white rounded-2xl p-4 mb-4 space-y-2.5">
          {order.items?.map((item: any) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.nameArSnapshot}</p>
                <p className="text-xs text-gray-400">
                  {item.quantity} × {formatPrice(Number(item.priceSnapshot))}
                </p>
              </div>
              <span className="font-bold text-gray-800 shrink-0 mr-2">
                {formatPrice(Number(item.priceSnapshot) * item.quantity)}
              </span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="bg-white rounded-2xl p-4 mb-5 space-y-1.5">
          <div className="flex justify-between text-sm text-gray-500">
            <span>المجموع</span>
            <span>{formatPrice(Number(order.subtotal))}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>الضريبة 15%</span>
            <span>{formatPrice(Number(order.tax))}</span>
          </div>
          <div className="flex justify-between font-black text-lg pt-2 border-t border-gray-100">
            <span className="text-gray-900">الإجمالي</span>
            <span className="text-blue-700">{formatPrice(Number(order.total))}</span>
          </div>
        </div>

        {/* Payment method */}
        {!showReject && (
          <div className="mb-5">
            <p className="text-xs font-bold text-gray-700 mb-2">اختر طريقة الدفع:</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'كاش عند الاستلام', value: PaymentMethod.CASH, key: 'cash' },
                { label: 'مدى', value: PaymentMethod.MADA, key: 'mada' },
                { label: 'Apple Pay', value: PaymentMethod.APPLE_PAY, key: 'apple_pay' },
                { label: 'بطاقة', value: PaymentMethod.CARD, key: 'card' },
              ]
                .filter((m) => !allowedPayments || allowedPayments[m.key] !== false)
                .map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setPaymentMethod(m.value)}
                    className={`p-2.5 rounded-xl border-2 text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                      paymentMethod === m.value
                        ? 'border-blue-700 bg-blue-50 text-blue-900 shadow-md'
                        : 'border-gray-200 bg-white text-gray-600'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Reject reason input */}
        {showReject && (
          <div className="mb-4 animate-fade-up">
            <p className="text-xs font-bold text-gray-700 mb-2">سبب الرفض (اختياري):</p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثل: السعر مرتفع جداً"
              className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-red-400 h-20 resize-none"
            />
          </div>
        )}

        {/* Buttons */}
        {!showReject ? (
          <div className="space-y-2">
            <button
              onClick={approve}
              disabled={loading !== null}
              className="w-full bg-gradient-to-l from-emerald-500 to-emerald-600 text-white py-4 rounded-2xl font-black text-base shadow-lg shadow-emerald-500/40 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {loading === 'approve' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  أوافق على السعر — {formatPrice(Number(order.total))}
                </>
              )}
            </button>
            <button
              onClick={() => setShowReject(true)}
              disabled={loading !== null}
              className="w-full text-red-600 text-sm font-medium py-2.5 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
            >
              لا أوافق — إلغاء الطلب
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              onClick={reject}
              disabled={loading !== null}
              className="w-full bg-red-500 text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {loading === 'reject' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <XCircle className="h-5 w-5" />
                  تأكيد الإلغاء
                </>
              )}
            </button>
            <button
              onClick={() => setShowReject(false)}
              disabled={loading !== null}
              className="w-full text-gray-600 text-sm font-medium py-2.5 hover:bg-gray-100 rounded-xl cursor-pointer"
            >
              رجوع
            </button>
          </div>
        )}
      </div>

      {/* Pending state indicator */}
      <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 items-start">
        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-800 leading-relaxed">
          هذا الطلب في انتظار موافقتك. لن يبدأ المحل بالتحضير حتى تؤكد السعر.
        </p>
      </div>
    </div>
  );
}
