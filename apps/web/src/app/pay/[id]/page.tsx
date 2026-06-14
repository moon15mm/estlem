'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, Lock, ArrowRight, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
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

  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  useEffect(() => {
    api.get(`/orders/${orderId}`)
      .then((d) => setOrder(d as unknown as Order))
      .catch(() => toast.error('فشل تحميل الطلب'))
      .finally(() => setLoadingOrder(false));
  }, [orderId]);

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
    if (d.startsWith('4')) return 'VISA';
    if (d.startsWith('5')) return 'MC';
    if (d.startsWith('22') || d.startsWith('588') || d.startsWith('968')) return 'مدى';
    return null;
  })();

  const isFormValid = () =>
    cardNumber.replace(/\s/g, '').length >= 13 &&
    cardName.trim().length >= 3 &&
    expiry.length === 5 &&
    cvv.length >= 3;

  const submitPayment = async () => {
    if (!isFormValid()) { toast.error('أكمل بيانات البطاقة'); return; }
    setProcessing(true);
    try {
      const returnUrl = `${window.location.origin}/order/${orderId}`;
      const session = await api.post('/payments/initiate', {
        orderId,
        method: order?.paymentMethod ?? 'card',
        returnUrl,
      }) as { paymentUrl?: string; testMode?: boolean; sessionId?: string };

      if (session?.testMode && session.sessionId) {
        await new Promise((r) => setTimeout(r, 1500));
        await api.post(`/payments/test-confirm/${session.sessionId}`, {}).catch(() => {});
        toast.success('تم الدفع بنجاح!', { duration: 3000 });
        await new Promise((r) => setTimeout(r, 800));
        router.push(`/order/${orderId}?payment=success`);
      } else if (session?.paymentUrl) {
        window.location.href = session.paymentUrl;
      } else {
        toast.error('فشل بدء معالجة الدفع');
      }
    } catch (err: any) {
      const rawMsg = err?.response?.data?.message;
      toast.error(typeof rawMsg === 'string' ? rawMsg : 'فشل الدفع');
    } finally {
      setProcessing(false);
    }
  };

  if (loadingOrder) {
    return (
      <div className="min-h-screen bg-[#F8F8F8] flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#EBEBEB] border-t-[#111] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[#999]">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#F8F8F8] flex items-center justify-center" dir="rtl">
        <p className="text-[#999] text-sm">الطلب غير موجود</p>
      </div>
    );
  }

  const inputClass = 'w-full bg-[#F5F5F5] border border-[#EBEBEB] rounded-2xl px-4 py-3.5 text-base focus:outline-none focus:border-[#999] focus:bg-white transition-all';

  return (
    <div className="min-h-screen bg-[#F8F8F8] pb-12" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-[#F0F0F0] px-5 pt-12 pb-5">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-[#555] text-sm font-medium mb-5"
        >
          <ArrowRight className="h-4 w-4" /> رجوع
        </button>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-[#F5F5F5] rounded-xl flex items-center justify-center">
            <Lock className="h-5 w-5 text-[#333]" />
          </div>
          <div>
            <h1 className="font-black text-[#111] text-lg">إتمام الدفع</h1>
            <p className="text-xs text-[#AAA]">طلب #{order.orderNumber}</p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-4 space-y-3">
        {/* Amount */}
        <div className="bg-white border border-[#EBEBEB] rounded-2xl p-4 flex items-center justify-between">
          <span className="text-sm text-[#999]">المبلغ المستحق</span>
          <span className="text-2xl font-black text-[#111]">{formatPrice(Number(order.total))}</span>
        </div>

        {/* Card preview strip */}
        <div className="bg-[#111] rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-7 bg-[#FFD700] rounded-md opacity-90" />
            {cardType && <span className="text-sm font-black tracking-widest opacity-70">{cardType}</span>}
          </div>
          <p className="text-lg tracking-widest font-mono opacity-80 mb-3" dir="ltr">
            {cardNumber || '•••• •••• •••• ••••'}
          </p>
          <div className="flex items-end justify-between text-xs opacity-60">
            <div>
              <p className="text-[10px] uppercase mb-0.5">حامل البطاقة</p>
              <p className="font-bold uppercase">{cardName || 'YOUR NAME'}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase mb-0.5">انتهاء</p>
              <p className="font-bold font-mono">{expiry || 'MM/YY'}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white border border-[#EBEBEB] rounded-2xl p-5 space-y-4">
          <div>
            <label className="text-[10px] font-black text-[#BBB] tracking-widest uppercase mb-1.5 block">رقم البطاقة</label>
            <div className="relative">
              <CreditCard className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#CCC]" />
              <input
                type="text"
                inputMode="numeric"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                placeholder="0000 0000 0000 0000"
                dir="ltr"
                className={`${inputClass} pr-12 font-mono tracking-wider`}
                maxLength={19}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-[#BBB] tracking-widest uppercase mb-1.5 block">اسم حامل البطاقة</label>
            <input
              type="text"
              value={cardName}
              onChange={(e) => setCardName(e.target.value.toUpperCase())}
              placeholder="MAHER M ALDOUSARY"
              dir="ltr"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-[#BBB] tracking-widest uppercase mb-1.5 block">انتهاء</label>
              <input
                type="text"
                inputMode="numeric"
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                placeholder="MM/YY"
                dir="ltr"
                className={`${inputClass} text-center font-mono`}
                maxLength={5}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-[#BBB] tracking-widest uppercase mb-1.5 block">CVV</label>
              <input
                type="password"
                inputMode="numeric"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="123"
                dir="ltr"
                className={`${inputClass} text-center font-mono`}
                maxLength={4}
              />
            </div>
          </div>

          {/* Test mode */}
          <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-3 flex gap-2">
            <AlertCircle className="h-4 w-4 text-[#D97706] shrink-0 mt-0.5" />
            <div className="text-xs text-[#92400E] leading-relaxed">
              <p className="font-bold mb-0.5">وضع تجريبي</p>
              <p>البطاقة: <code className="bg-[#FEF3C7] px-1 rounded font-mono text-[10px]" dir="ltr">4111 1111 1111 1111</code> • أي اسم • تاريخ مستقبلي • أي CVV</p>
            </div>
          </div>

          <button
            onClick={submitPayment}
            disabled={!isFormValid() || processing}
            className="w-full bg-[#111] text-white py-4 rounded-2xl font-black text-base disabled:opacity-30 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            {processing ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> جاري معالجة الدفع...</>
            ) : (
              <><Lock className="h-4 w-4" /> ادفع {formatPrice(Number(order.total))}</>
            )}
          </button>

          <div className="flex items-center justify-center gap-2 text-xs text-[#BBB]">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>دفع آمن ومشفّر</span>
          </div>

          <div className="flex items-center justify-center gap-4 opacity-40">
            {['VISA', 'MC', 'مدى', 'Apple Pay'].map((b) => (
              <span key={b} className="text-[11px] font-bold text-[#555]">{b}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
