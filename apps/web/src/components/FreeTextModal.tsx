'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { OrderType, PaymentMethod } from '@estlem/shared';
import { formatPrice } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Props {
  open: boolean;
  onClose: () => void;
  storeId: string;
  tenantId: string;
}

interface ParsedItem {
  name: string;
  nameAr: string;
  quantity: number;
  price: number;
  productId?: string;
  confidence: number;
}

export function FreeTextModal({ open, onClose, storeId, tenantId }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<'input' | 'confirm' | 'checkout'>('input');
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<ParsedItem[]>([]);
  const [parsing, setParsing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: '', mobile: '',
    make: '', model: '', color: '', plateNumber: '',
    paymentMethod: PaymentMethod.CASH,
  });

  const parseList = async () => {
    if (!text.trim()) return;
    setParsing(true);
    try {
      const result = await api.post('/orders/ai-parse', {
        rawRequest: text, storeId,
      }) as ParsedItem[];
      setParsed(result);
      setStep('confirm');
    } catch {
      toast.error('فشل التحليل، حاول مجدداً');
    } finally {
      setParsing(false);
    }
  };

  const submit = async () => {
    if (!form.fullName || !form.mobile) {
      toast.error('يرجى إدخال الاسم ورقم الجوال');
      return;
    }
    setLoading(true);
    try {
      const spotId = sessionStorage.getItem('estlem_spot_id');
      const order = await api.post('/orders', {
        storeId, tenantId,
        type: OrderType.FREE_TEXT,
        paymentMethod: form.paymentMethod,
        parkingSpotId: spotId ?? undefined,
        rawRequest: text,
        customer: {
          fullName: form.fullName, mobile: form.mobile,
          vehicle: form.make ? {
            make: form.make, model: form.model,
            color: form.color, plateNumber: form.plateNumber,
          } : undefined,
        },
      }) as { id: string };
      router.push(`/order/${order.id}`);
    } catch {
      toast.error('فشل إرسال الطلب');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" dir="rtl">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">✨ قائمة التسوق الذكية</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl">&times;</button>
        </div>

        {step === 'input' && (
          <>
            <p className="text-gray-500 text-sm mb-3">
              اكتب قائمة مشترياتك بحرية — سنحولها إلى طلب تلقائياً
            </p>
            <textarea
              className="w-full border border-gray-200 rounded-xl p-4 text-sm h-36 resize-none focus:outline-none focus:border-blue-400 bg-gray-50"
              placeholder={'مثال:\nحليب ٢ لتر\nبيض ١٢ حبة\nخبز بر'}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button
              onClick={parseList}
              disabled={!text.trim() || parsing}
              className="w-full mt-3 bg-emerald-500 text-white py-3.5 rounded-xl font-bold disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {parsing ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '🔍 تحليل القائمة'}
            </button>
          </>
        )}

        {step === 'confirm' && (
          <>
            <p className="text-sm text-gray-500 mb-3">راجع القائمة المحللة:</p>
            <div className="space-y-2 mb-4">
              {parsed.map((item, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                  <div>
                    <p className="font-medium text-sm">{item.nameAr}</p>
                    {item.price > 0 && (
                      <p className="text-blue-700 text-xs">{formatPrice(item.price)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      item.confidence > 0.7 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {item.confidence > 0.7 ? 'مطابق' : 'تقريبي'}
                    </span>
                    <span className="text-sm font-bold">× {item.quantity}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep('input')} className="flex-1 border border-gray-200 py-3 rounded-xl text-sm">
                تعديل
              </button>
              <button onClick={() => setStep('checkout')} className="flex-1 bg-blue-900 text-white py-3 rounded-xl font-bold text-sm">
                متابعة
              </button>
            </div>
          </>
        )}

        {step === 'checkout' && (
          <div className="space-y-4">
            <button onClick={() => setStep('confirm')} className="text-blue-600 text-sm">
              ← رجوع
            </button>
            <input className="input" placeholder="الاسم الكامل *" value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            <input className="input" placeholder="رقم الجوال *" type="tel" value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input className="input" placeholder="الماركة" value={form.make}
                onChange={(e) => setForm({ ...form, make: e.target.value })} />
              <input className="input" placeholder="الموديل" value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })} />
              <input className="input" placeholder="اللون" value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })} />
              <input className="input" placeholder="رقم اللوحة" value={form.plateNumber}
                onChange={(e) => setForm({ ...form, plateNumber: e.target.value })} />
            </div>
            <button
              onClick={submit}
              disabled={loading}
              className="w-full bg-blue-900 text-white py-4 rounded-xl font-bold disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading
                ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : '✅ إرسال الطلب'}
            </button>
          </div>
        )}
      </div>
      <style jsx>{`.input { @apply w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 bg-gray-50; }`}</style>
    </div>
  );
}
