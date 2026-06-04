'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, Lock, ArrowRight, Loader2, ShieldCheck, AlertCircle, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import type { Order } from '@estlem/shared';

interface Props { params: { id: string } }

export default function PaymentPage({ params }: Props) {
  const router = useRouter();
  const orderId = params.id;
  const [order, setOrder] = useState<Order | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Card form
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  useEffect(() => {
    api.get(`/orders/${orderId}`)
      .then((d) => setOrder(d as Order))
      .catch(() => toast.error('فشل تحميل الطلب'))
      .finally(() => setLoadingOrder(false));
  }, [orderId]);

  // Card number formatting (1234 5678 9012 3456)
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
      const returnUrl = `${window.location.origin}/order/${orderId}`;
      // Try to use real Moyasar checkout if configured
      const session = await api.post('/payments/initiate', {
        orderId,
        method: order?.paymentMethod ?? 'card',
        returnUrl,
      }) as { paymentUrl?: string; testMode?: boolean; sessionId?: string };

      if (session?.testMode && session.sessionId) {
        // Test mode: simulate 1.5s processing then confirm
        await new Promise((r) => setTimeout(r, 1500));
        await api.post(`/payments/test-confirm/${session.sessionId}`, {}).catch(() => {});
        toast.success('تم الدفع بنجاح!', { icon: '✓', duration: 3000 });
        await new Promise((r) => setTimeout(r, 800));
        router.push(`/order/${orderId}?payment=success`);
      } else if (session?.paymentUrl) {
        // Real gateway → redirect to hosted page
        window.location.href = session.paymentUrl;
      } else {
        toast.error('فشل بدء معالجة الدفع');
      }
    } catch (err: any) {
      const rawMsg = err?.response?.data?.message;
      const msg = typeof rawMsg === 'string' ? rawMsg : JSON.stringify(rawMsg ?? '');
      toast.error(msg || 'فشل الدفع');
    } finally {
      setProcessing(false);
    }
  };

  if (loadingOrder) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0F3460] to-[#1B4F72] flex items-center justify-center" dir="rtl">
        <Loader2 className="h-10 w-10 animate-spin text-white" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <p className="text-gray-500">الطلب غير موجود</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F3460] via-[#1B4F72] to-[#F8FAFC] pb-12" dir="rtl">
      {/* Header */}
      <div className="px-5 pt-12 pb-6">
        <button onClick={() => router.back()} className="text-white/70 hover:text-white text-sm flex items-center gap-1 mb-6 cursor-pointer">
          <ArrowRight className="h-4 w-4" /> رجوع
        </button>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/15">
            <Lock className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">إتمام الدفع</h1>
            <p className="text-white/60 text-xs">طلب #{order.orderNumber}</p>
          </div>
        </div>
      </div>

      {/* Card preview */}
      <div className="px-5 mb-6">
        <div className="relative max-w-sm mx-auto h-52 rounded-3xl shadow-2xl overflow-hidden bg-gradient-to-br from-[#1B4F72] via-[#16537E] to-[#1ABC9C] p-6">
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />

          <div className="relative h-full flex flex-col justify-between text-white">
            <div className="flex items-start justify-between">
              <div className="w-12 h-9 bg-yellow-400/90 rounded-md" />
              <div className="text-right">
                {cardType === 'visa' && <span className="text-xl font-black italic">VISA</span>}
                {cardType === 'mastercard' && <span className="text-xl font-black">MC</span>}
                {cardType === 'mada' && <span className="text-base font-black">مدى</span>}
                {cardType === 'card' && <CreditCard className="h-6 w-6" />}
              </div>
            </div>

            <p className="text-xl tracking-widest font-mono" dir="ltr">
              {cardNumber || '•••• •••• •••• ••••'}
            </p>

            <div className="flex items-end justify-between text-xs">
              <div>
                <p className="text-white/50 text-[10px] uppercase">حامل البطاقة</p>
                <p className="font-bold uppercase">{cardName || 'YOUR NAME'}</p>
              </div>
              <div>
                <p className="text-white/50 text-[10px] uppercase">انتهاء</p>
                <p className="font-bold font-mono">{expiry || 'MM/YY'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-t-[2rem] -mt-2 px-5 pt-6 pb-8 shadow-2xl space-y-4">
        {/* Amount summary */}
        <div className="bg-secondary rounded-2xl p-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">المبلغ المستحق</span>
          <span className="text-2xl font-black text-[#1B4F72]">{formatPrice(Number(order.total))}</span>
        </div>

        {/* Card number */}
        <div>
          <label className="text-xs font-bold text-gray-600 mb-1.5 block">رقم البطاقة</label>
          <div className="relative">
            <CreditCard className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              inputMode="numeric"
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              placeholder="0000 0000 0000 0000"
              dir="ltr"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pr-12 pl-4 py-3.5 text-base font-mono tracking-wider focus:outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/10"
              maxLength={19}
            />
          </div>
        </div>

        {/* Card name */}
        <div>
          <label className="text-xs font-bold text-gray-600 mb-1.5 block">اسم حامل البطاقة</label>
          <input
            type="text"
            value={cardName}
            onChange={(e) => setCardName(e.target.value.toUpperCase())}
            placeholder="MAHER M ALDOUSARY"
            dir="ltr"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base focus:outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/10"
          />
        </div>

        {/* Expiry + CVV */}
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
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base text-center font-mono focus:outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/10"
              maxLength={5}
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
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base text-center font-mono focus:outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/10"
              maxLength={4}
            />
          </div>
        </div>

        {/* Test mode info */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <p className="font-bold mb-0.5">وضع تجريبي</p>
            <p>استخدم البطاقة: <code className="bg-amber-100 px-1 rounded font-mono text-[10px]" dir="ltr">4111 1111 1111 1111</code> • أي اسم • تاريخ مستقبلي • أي CVV</p>
          </div>
        </div>

        {/* Pay button */}
        <button
          onClick={submitPayment}
          disabled={!isFormValid() || processing}
          className="w-full bg-gradient-to-l from-[#1B4F72] to-[#16537E] text-white py-4 rounded-2xl font-black text-base disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all shadow-lg shadow-[#1B4F72]/20"
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

        {/* Security badge */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>دفع آمن ومشفّر — بياناتك محمية</span>
        </div>

        <div className="flex items-center justify-center gap-4 pt-2 opacity-60">
          <span className="text-xs font-bold text-gray-500">VISA</span>
          <span className="text-xs font-bold text-gray-500">MC</span>
          <span className="text-xs font-bold text-gray-500">مدى</span>
          <span className="text-xs font-bold text-gray-500">Apple Pay</span>
        </div>
      </div>
    </div>
  );
}
