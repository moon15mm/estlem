'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import { formatPrice } from '@/lib/utils';
import { OrderType, PaymentMethod } from '@estlem/shared';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface Props {
  open: boolean;
  onClose: () => void;
  storeId: string;
  tenantId: string;
}

export function CartDrawer({ open, onClose, storeId, tenantId }: Props) {
  const router = useRouter();
  const { items, updateQty, removeItem, clearCart, total } = useCart();
  const [step, setStep] = useState<'cart' | 'checkout'>('cart');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: '', mobile: '',
    make: '', model: '', color: '', plateNumber: '',
    paymentMethod: PaymentMethod.MADA,
    notes: '',
  });

  const TAX = 0.15;
  const subtotal = total();
  const tax = subtotal * TAX;
  const grandTotal = subtotal + tax;

  const submit = async () => {
    if (!form.fullName || !form.mobile) {
      toast.error('يرجى إدخال الاسم ورقم الجوال');
      return;
    }
    setLoading(true);
    try {
      const spotId = sessionStorage.getItem('estlem_spot_id');
      const payload = {
        storeId, tenantId,
        type: OrderType.CATALOG,
        paymentMethod: form.paymentMethod,
        parkingSpotId: spotId ?? undefined,
        notes: form.notes || undefined,
        items: items.map((i) => ({
          productId: i.productId,
          nameSnapshot: i.nameSnapshot,
          nameArSnapshot: i.nameArSnapshot,
          priceSnapshot: i.priceSnapshot,
          quantity: i.quantity,
        })),
        customer: {
          fullName: form.fullName,
          mobile: form.mobile,
          vehicle: form.make ? {
            make: form.make, model: form.model,
            color: form.color, plateNumber: form.plateNumber,
          } : undefined,
        },
      };
      const order = await api.post('/orders', payload) as { id: string };
      clearCart();
      router.push(`/order/${order.id}`);
    } catch (err: unknown) {
      toast.error('فشل إرسال الطلب، حاول مجدداً');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" dir="rtl">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-4 pt-4 pb-2 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-lg">
            {step === 'cart' ? '🛒 سلة التسوق' : '📋 إتمام الطلب'}
          </h2>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none">&times;</button>
        </div>

        {step === 'cart' ? (
          <div className="p-4">
            {items.length === 0 ? (
              <p className="text-center text-gray-400 py-12">السلة فارغة</p>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  {items.map((item) => (
                    <div key={item.productId ?? item.nameSnapshot} className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.nameArSnapshot}</p>
                        <p className="text-blue-700 text-sm font-bold">
                          {formatPrice(item.priceSnapshot)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 bg-gray-100 rounded-full px-2 py-1">
                        <button
                          onClick={() => updateQty(item.productId!, item.quantity - 1)}
                          className="w-6 h-6 flex items-center justify-center text-gray-600 font-bold"
                        >−</button>
                        <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQty(item.productId!, item.quantity + 1)}
                          className="w-6 h-6 flex items-center justify-center text-gray-600 font-bold"
                        >+</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-3 space-y-1 text-sm">
                  <div className="flex justify-between text-gray-500">
                    <span>المجموع</span><span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>ضريبة القيمة المضافة (15%)</span><span>{formatPrice(tax)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base border-t pt-2">
                    <span>الإجمالي</span><span className="text-blue-900">{formatPrice(grandTotal)}</span>
                  </div>
                </div>

                <button
                  onClick={() => setStep('checkout')}
                  className="w-full mt-4 bg-blue-900 text-white py-3.5 rounded-xl font-bold text-base"
                >
                  متابعة لإتمام الطلب
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <button onClick={() => setStep('cart')} className="text-blue-600 text-sm flex items-center gap-1">
              ← رجوع للسلة
            </button>

            {/* Customer info */}
            <div className="space-y-3">
              <h3 className="font-bold text-gray-700">بياناتك</h3>
              <input className="input" placeholder="الاسم الكامل *" value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              <input className="input" placeholder="رقم الجوال *" type="tel" value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
            </div>

            {/* Vehicle info */}
            <div className="space-y-3">
              <h3 className="font-bold text-gray-700">بيانات السيارة (اختياري)</h3>
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
            </div>

            {/* Payment */}
            <div>
              <h3 className="font-bold text-gray-700 mb-2">طريقة الدفع</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'مدى', value: PaymentMethod.MADA },
                  { label: 'Apple Pay', value: PaymentMethod.APPLE_PAY },
                  { label: 'بطاقة ائتمان', value: PaymentMethod.CARD },
                  { label: 'كاش عند الاستلام', value: PaymentMethod.CASH },
                ].map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setForm({ ...form, paymentMethod: m.value })}
                    className={`p-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                      form.paymentMethod === m.value
                        ? 'border-blue-900 bg-blue-50 text-blue-900'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <textarea
              className="input resize-none h-20"
              placeholder="ملاحظات إضافية (اختياري)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />

            <div className="bg-blue-50 rounded-xl p-3 flex justify-between items-center">
              <span className="font-bold text-gray-700">الإجمالي</span>
              <span className="font-black text-blue-900 text-lg">{formatPrice(grandTotal)}</span>
            </div>

            <button
              onClick={submit}
              disabled={loading}
              className="w-full bg-blue-900 text-white py-4 rounded-xl font-bold text-base disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : '✅ تأكيد الطلب'}
            </button>
          </div>
        )}
      </div>
      <style jsx>{`.input { @apply w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 bg-gray-50; }`}</style>
    </div>
  );
}
