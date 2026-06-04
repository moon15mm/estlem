'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { formatPrice } from '@/lib/utils';
import { OrderType, PaymentMethod } from '@estlem/shared';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface PaymentSettings {
  cash?: boolean;
  card?: boolean;
  mada?: boolean;
  apple_pay?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  storeId: string;
  tenantId: string;
  allowedPayments?: PaymentSettings;
}

export function CartDrawer({ open, onClose, storeId, tenantId, allowedPayments }: Props) {
  const router = useRouter();
  const { items, updateQty, removeItem, clearCart, total, freeTextNotes, getItemKey, hasFreeTextItems } = useCart();
  const { customer, isLoggedIn } = useCustomerAuth();
  const [step, setStep] = useState<'cart' | 'checkout'>('cart');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: '', mobile: '',
    make: '', model: '', color: '', plateNumber: '',
    paymentMethod: PaymentMethod.MADA,
    notes: '',
  });

  const spotType = typeof window !== 'undefined' ? sessionStorage.getItem('estlem_spot_type') : null;
  const isDineIn = spotType === 'table';

  // Auto-fill customer data + default vehicle
  useEffect(() => {
    if (isLoggedIn() && customer) {
      const defaultVehicle = customer.vehicles?.find((v) => v.isDefault) || customer.vehicles?.[0];
      setForm((prev) => ({
        ...prev,
        fullName: prev.fullName || customer.fullName || '',
        mobile: prev.mobile || customer.mobile || '',
        make: prev.make || defaultVehicle?.make || '',
        model: prev.model || defaultVehicle?.model || '',
        color: prev.color || defaultVehicle?.color || '',
        plateNumber: prev.plateNumber || defaultVehicle?.plateNumber || '',
      }));
    }
  }, [customer]);

  const savedVehicles = customer?.vehicles ?? [];

  const TAX = 0.15;
  const subtotal = total();
  const tax = subtotal * TAX;
  const grandTotal = subtotal + tax;

  const catalogItems = items.filter((i) => !i.isFreeText);
  const freeItems = items.filter((i) => i.isFreeText);

  // If there are free-text items WITHOUT a confirmed price, force cash payment
  const hasUnpricedFreeItems = freeItems.some((i) => !i.priceSnapshot || i.priceSnapshot === 0);
  const forceCashPayment = hasUnpricedFreeItems;

  // Auto-switch to cash if forced
  useEffect(() => {
    if (forceCashPayment && form.paymentMethod !== PaymentMethod.CASH) {
      setForm((prev) => ({ ...prev, paymentMethod: PaymentMethod.CASH }));
    }
  }, [forceCashPayment]);

  const submit = async () => {
    if (!form.fullName || !form.mobile) {
      toast.error('يرجى إدخال الاسم ورقم الجوال');
      return;
    }
    setLoading(true);
    try {
      const spotId = sessionStorage.getItem('estlem_spot_id');
      const payload: Record<string, unknown> = {
        storeId, tenantId,
        type: hasFreeTextItems() ? OrderType.CATALOG : OrderType.CATALOG,
        paymentMethod: form.paymentMethod,
        parkingSpotId: spotId ?? undefined,
        notes: [form.notes, freeTextNotes].filter(Boolean).join('\n') || undefined,
        rawRequest: freeTextNotes || undefined,
        items: items.map((i) => ({
          productId: i.productId || undefined,
          nameSnapshot: i.nameSnapshot,
          nameArSnapshot: i.nameArSnapshot,
          priceSnapshot: i.priceSnapshot,
          quantity: i.quantity,
          notes: i.isFreeText ? 'قائمة حرة' : undefined,
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
    } catch {
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
                {/* Catalog items section */}
                {catalogItems.length > 0 && (
                  <div className="mb-4">
                    {freeItems.length > 0 && (
                      <p className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-1">
                        📦 من الكتالوج
                      </p>
                    )}
                    <div className="space-y-3">
                      {catalogItems.map((item) => {
                        const key = getItemKey(item);
                        return (
                          <div key={key} className="flex items-center gap-3">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{item.nameArSnapshot}</p>
                              <p className="text-blue-700 text-sm font-bold">{formatPrice(item.priceSnapshot)}</p>
                            </div>
                            <div className="flex items-center gap-2 bg-gray-100 rounded-full px-2 py-1">
                              <button onClick={() => updateQty(key, item.quantity - 1)}
                                className="w-6 h-6 flex items-center justify-center text-gray-600 font-bold">-</button>
                              <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                              <button onClick={() => updateQty(key, item.quantity + 1)}
                                className="w-6 h-6 flex items-center justify-center text-gray-600 font-bold">+</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Free text items section */}
                {freeItems.length > 0 && (
                  <div className="mb-4">
                    {catalogItems.length > 0 && (
                      <p className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-1">
                        ✍️ من القائمة الحرة
                      </p>
                    )}
                    {hasUnpricedFreeItems && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 mb-3 flex gap-2 items-start">
                        <span className="text-amber-500 text-sm leading-none mt-0.5">💵</span>
                        <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                          عناصر القائمة الحرة بسعر تقديري — سيُؤكَّد السعر النهائي عند التجهيز والدفع كاش عند الاستلام
                        </p>
                      </div>
                    )}
                    <div className="space-y-3">
                      {freeItems.map((item) => {
                        const key = getItemKey(item);
                        return (
                          <div key={key} className="flex items-center gap-3">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{item.nameArSnapshot}</p>
                              <div className="flex items-center gap-1.5">
                                {item.priceSnapshot > 0 ? (
                                  <p className="text-blue-700 text-sm font-bold">{formatPrice(item.priceSnapshot)}</p>
                                ) : (
                                  <p className="text-amber-600 text-xs">سعر تقديري</p>
                                )}
                                <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">حر</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 bg-gray-100 rounded-full px-2 py-1">
                              <button onClick={() => updateQty(key, item.quantity - 1)}
                                className="w-6 h-6 flex items-center justify-center text-gray-600 font-bold">-</button>
                              <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                              <button onClick={() => updateQty(key, item.quantity + 1)}
                                className="w-6 h-6 flex items-center justify-center text-gray-600 font-bold">+</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

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

            <div className="space-y-3">
              <h3 className="font-bold text-gray-700">بياناتك</h3>
              <input className="input" placeholder="الاسم الكامل *" value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              <input className="input" placeholder="رقم الجوال *" type="tel" value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
            </div>

            {!isDineIn && (
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
            )}

            <div>
              <h3 className="font-bold text-gray-700 mb-2">طريقة الدفع</h3>

              {forceCashPayment && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 flex gap-2">
                  <span className="text-amber-500 text-lg leading-none">⚠</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-amber-900">الدفع عند الاستلام فقط</p>
                    <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                      طلبك يحتوي على عناصر من القائمة الحرة لم يتم تحديد سعرها بعد. سيتم تأكيد السعر النهائي عند تجهيز الطلب وتدفع نقداً عند الاستلام لتجنب أي خلاف.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'مدى', value: PaymentMethod.MADA, key: 'mada' },
                  { label: 'Apple Pay', value: PaymentMethod.APPLE_PAY, key: 'apple_pay' },
                  { label: 'بطاقة ائتمان', value: PaymentMethod.CARD, key: 'card' },
                  { label: 'كاش عند الاستلام', value: PaymentMethod.CASH, key: 'cash' },
                ]
                  .filter((m) => !allowedPayments || allowedPayments[m.key as keyof PaymentSettings] !== false)
                  .filter((m) => !forceCashPayment || m.value === PaymentMethod.CASH)
                  .map((m) => (
                    <button
                      key={m.value}
                      onClick={() => !forceCashPayment && setForm({ ...form, paymentMethod: m.value })}
                      disabled={forceCashPayment && m.value !== PaymentMethod.CASH}
                      className={`p-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                        form.paymentMethod === m.value
                          ? 'border-blue-900 bg-blue-50 text-blue-900'
                          : 'border-gray-200 text-gray-600'
                      } ${forceCashPayment ? 'col-span-2' : ''}`}
                    >
                      {m.label}
                      {forceCashPayment && m.value === PaymentMethod.CASH && (
                        <span className="block text-[10px] text-amber-600 mt-1 font-normal">إجباري لعناصر القائمة الحرة</span>
                      )}
                    </button>
                  ))}
              </div>
            </div>

            <textarea
              className="input resize-none h-20"
              placeholder="ملاحظات إضافية (اختياري)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />

            <div className="bg-blue-50 rounded-xl p-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-700">الإجمالي</span>
                <span className="font-black text-blue-900 text-lg">{formatPrice(grandTotal)}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {catalogItems.length > 0 && `${catalogItems.length} من الكتالوج`}
                {catalogItems.length > 0 && freeItems.length > 0 && ' + '}
                {freeItems.length > 0 && `${freeItems.length} من القائمة الحرة`}
              </p>
            </div>

            <button
              onClick={submit}
              disabled={loading}
              className="w-full bg-blue-900 text-white py-4 rounded-xl font-bold text-base disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : 'تأكيد الطلب'}
            </button>
          </div>
        )}
      </div>
      <style jsx>{`.input { @apply w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 bg-gray-50; }`}</style>
    </div>
  );
}
