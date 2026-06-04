'use client';

import { useState } from 'react';
import { CreditCard, Lock, X, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import type { Order } from '@estlem/shared';

interface Props {
  order: Order;
  onClose: () => void;
  onSuccess: () => void;
}

export function PaymentModal({ order, onClose, onSuccess }: Props) {
  const [processing, setProcessing] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  const formatCardNumber = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  };

  const formatExpiry = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 4);
    if (digits.length < 3) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  };

  const cardType = (() => {
    const d = cardNumber.replace(/\s/g, '');
    if (d.startsWith('4')) return 'visa';
    if (d.startsWith('5')) return 'mastercard';
    if (d.startsWith('22') || d.startsWith('588') || d.startsWith('968')) return 'mada';
    return 'card';
  })();

  const isFormValid = () => {
    return (
      cardNumber.replace(/\s/g, '').length >= 13 &&
      cardName.trim().length >= 3 &&
      expiry.length === 5 &&
      cvv.length >= 3
    );
  };

  const submitPayment = async () => {
    if (!isFormValid()) {
      toast.error('أكمل بيانات البطاقة');
      return;
    }
    setProcessing(true);
    try {
      const returnUrl = `${window.location.origin}/order/${order.id}`;
      const session = await api.post('/payments/initiate', {
        orderId: order.id,
        method: order.paymentMethod,
        returnUrl,
      }) as { paymentUrl?: string; testMode?: boolean; sessionId?: string };

      if (session?.testMode && session.sessionId) {
        await new Promise((r) => setTimeout(r, 1500));
        await api.post(`/payments/test-confirm/${session.sessionId}`, {}).catch(() => {});
        toast.success('تم الدفع بنجاح!', { icon: '✓', duration: 3000 });
        await new Promise((r) => setTimeout(r, 500));
        onSuccess();
      } else if (session?.paymentUrl) {
        window.location.href = session.paymentUrl;
      } else {
        toast.error('فشل بدء معالجة الدفع');
        setProcessing(false);
      }
    } catch (err: any) {
      const rawMsg = err?.response?.data?.message;
      const msg = typeof rawMsg === 'string' ? rawMsg : JSON.stringify(rawMsg ?? '');
      toast.error(msg || 'فشل الدفع');
      setProcessing(false);
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
          <button onClick={onClose} disabled={processing} className="text-white/70 hover:text-white cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Card preview */}
          <div className="relative h-44 rounded-2xl shadow-xl overflow-hidden bg-gradient-to-br from-[#1B4F72] via-[#16537E] to-[#1ABC9C] p-5">
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
            <div className="relative h-full flex flex-col justify-between text-white">
              <div className="flex items-start justify-between">
                <div className="w-10 h-7 bg-yellow-400/90 rounded-md" />
                <div className="text-right">
                  {cardType === 'visa' && <span className="text-lg font-black italic">VISA</span>}
                  {cardType === 'mastercard' && <span className="text-lg font-black">MC</span>}
                  {cardType === 'mada' && <span className="text-sm font-black">مدى</span>}
                  {cardType === 'card' && <CreditCard className="h-6 w-6" />}
                </div>
              </div>
              <p className="text-lg tracking-widest font-mono" dir="ltr">
                {cardNumber || '•••• •••• •••• ••••'}
              </p>
              <div className="flex items-end justify-between text-xs">
                <div>
                  <p className="text-white/50 text-[10px] uppercase">الاسم</p>
                  <p className="font-bold uppercase truncate max-w-[140px]">{cardName || 'YOUR NAME'}</p>
                </div>
                <div>
                  <p className="text-white/50 text-[10px] uppercase">انتهاء</p>
                  <p className="font-bold font-mono">{expiry || 'MM/YY'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Amount */}
          <div className="bg-gray-100 rounded-2xl p-3 flex items-center justify-between">
            <span className="text-sm text-gray-600">المبلغ المستحق</span>
            <span className="text-xl font-black text-[#1B4F72]">{formatPrice(Number(order.total))}</span>
          </div>

          {/* Fields */}
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1.5 block">رقم البطاقة</label>
            <div className="relative">
              <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                inputMode="numeric"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                placeholder="0000 0000 0000 0000"
                dir="ltr"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pr-10 pl-3 py-3 text-sm font-mono focus:outline-none focus:border-[#1B4F72]"
                maxLength={19}
                disabled={processing}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 mb-1.5 block">اسم حامل البطاقة</label>
            <input
              type="text"
              value={cardName}
              onChange={(e) => setCardName(e.target.value.toUpperCase())}
              placeholder="MAHER ALDOUSARY"
              dir="ltr"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-[#1B4F72]"
              disabled={processing}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1.5 block">انتهاء</label>
              <input
                type="text"
                inputMode="numeric"
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                placeholder="MM/YY"
                dir="ltr"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-sm text-center font-mono focus:outline-none focus:border-[#1B4F72]"
                maxLength={5}
                disabled={processing}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1.5 block">CVV</label>
              <input
                type="password"
                inputMode="numeric"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="123"
                dir="ltr"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-sm text-center font-mono focus:outline-none focus:border-[#1B4F72]"
                maxLength={4}
                disabled={processing}
              />
            </div>
          </div>

          {/* Test info */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-amber-900 leading-relaxed">
              <p className="font-bold">وضع تجريبي</p>
              <p>استخدم: <code className="bg-amber-100 px-1 rounded font-mono" dir="ltr">4111 1111 1111 1111</code> + أي بيانات</p>
            </div>
          </div>

          <button
            onClick={submitPayment}
            disabled={!isFormValid() || processing}
            className="w-full bg-gradient-to-l from-[#1B4F72] to-[#16537E] text-white py-3.5 rounded-2xl font-black text-base disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all shadow-lg shadow-[#1B4F72]/20"
          >
            {processing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                جاري معالجة الدفع...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                ادفع {formatPrice(Number(order.total))}
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-400">
            <ShieldCheck className="h-3 w-3" />
            <span>دفع آمن ومشفّر — بياناتك محمية</span>
          </div>
        </div>
      </div>
    </div>
  );
}
