'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, ChevronRight, Minus, Plus, ShoppingBag, AlertCircle } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { formatPrice } from '@/lib/utils';
import { OrderType, PaymentMethod } from '@estlem/shared';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { useTranslation } from '@/lib/i18n/I18nProvider';

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
  const { t } = useTranslation();
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

  const subtotal = total();
  const grandTotal = subtotal;
  const catalogItems = items.filter((i) => !i.isFreeText);
  const freeItems = items.filter((i) => i.isFreeText);
  const hasUnpricedFreeItems = freeItems.some((i) => !i.priceSnapshot || i.priceSnapshot === 0);
  const forceCashPayment = hasUnpricedFreeItems;

  useEffect(() => {
    if (forceCashPayment && form.paymentMethod !== PaymentMethod.CASH) {
      setForm((prev) => ({ ...prev, paymentMethod: PaymentMethod.CASH }));
    }
  }, [forceCashPayment]);

  const submit = async () => {
    if (!form.fullName || !form.mobile) {
      toast.error(t('cart.fillNameMobile'));
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
          notes: i.isFreeText ? t('cart.freeList') : undefined,
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
      const order = await api.post('/orders', payload) as { id: string; status: string };
      clearCart();
      router.push(`/order/${order.id}`);
    } catch {
      toast.error(t('cart.orderFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const paymentOptions = [
    { label: t('cart.mada'), value: PaymentMethod.MADA, key: 'mada' },
    { label: 'Apple Pay', value: PaymentMethod.APPLE_PAY, key: 'apple_pay' },
    { label: t('cart.card'), value: PaymentMethod.CARD, key: 'card' },
    { label: t('cart.cash'), value: PaymentMethod.CASH, key: 'cash' },
  ]
    .filter((m) => !allowedPayments || allowedPayments[m.key as keyof PaymentSettings] !== false)
    .filter((m) => !forceCashPayment || m.value === PaymentMethod.CASH);

  return (
    <div className="fixed inset-0 z-50" dir="rtl">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={onClose} />

      {/* Sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[24px] max-h-[92vh] flex flex-col animate-slide-up-bounce">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-[#E5E5E5] rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#F0F0F0] flex-shrink-0">
          <div className="flex items-center gap-2">
            {step === 'checkout' && (
              <button
                onClick={() => setStep('cart')}
                className="w-8 h-8 rounded-xl bg-[#F5F5F5] flex items-center justify-center"
              >
                <ChevronRight className="h-4 w-4 text-[#555]" />
              </button>
            )}
            <h2 className="font-black text-[#111] text-base">
              {step === 'cart' ? t('cart.title') : t('cart.checkout')}
            </h2>
            {step === 'cart' && items.length > 0 && (
              <span className="text-[11px] text-[#999] bg-[#F5F5F5] px-2 py-0.5 rounded-full">
                {items.length} منتج
              </span>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-[#F5F5F5] flex items-center justify-center">
            <X className="h-4 w-4 text-[#555]" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 overscroll-contain">
          {step === 'cart' ? (
            <div className="px-5 py-4">
              {items.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-14 h-14 bg-[#F5F5F5] rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <ShoppingBag className="h-6 w-6 text-[#CCC]" />
                  </div>
                  <p className="font-bold text-[#333] text-sm">{t('cart.empty')}</p>
                  <p className="text-xs text-[#999] mt-1">أضف منتجات لتبدأ طلبك</p>
                </div>
              ) : (
                <>
                  {/* Catalog items */}
                  {catalogItems.length > 0 && (
                    <div className="mb-4">
                      {freeItems.length > 0 && (
                        <p className="text-[10px] font-black text-[#BBB] mb-3 tracking-widest uppercase">من الكتالوج</p>
                      )}
                      <div className="space-y-1">
                        {catalogItems.map((item) => {
                          const key = getItemKey(item);
                          return (
                            <div key={key} className="flex items-center gap-3 py-3 border-b border-[#F5F5F5] last:border-0">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-[#111] leading-snug">{item.nameArSnapshot}</p>
                                <p className="text-[#111] text-sm font-black mt-0.5">{formatPrice(item.priceSnapshot)}</p>
                              </div>
                              <div className="flex items-center gap-1.5 bg-[#F5F5F5] rounded-xl px-2 py-1.5">
                                <button
                                  onClick={() => updateQty(key, item.quantity - 1)}
                                  className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-[#EBEBEB] transition-colors"
                                >
                                  <Minus className="h-3 w-3 text-[#555]" />
                                </button>
                                <span className="text-sm font-black text-[#111] w-5 text-center">{item.quantity}</span>
                                <button
                                  onClick={() => updateQty(key, item.quantity + 1)}
                                  className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-[#EBEBEB] transition-colors"
                                >
                                  <Plus className="h-3 w-3 text-[#555]" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Free-text items */}
                  {freeItems.length > 0 && (
                    <div className="mb-4">
                      {catalogItems.length > 0 && (
                        <p className="text-[10px] font-black text-[#BBB] mb-3 tracking-widest uppercase">من القائمة الحرة</p>
                      )}
                      {hasUnpricedFreeItems && (
                        <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-3 mb-3 flex gap-2.5">
                          <AlertCircle className="h-4 w-4 text-[#D97706] shrink-0 mt-0.5" />
                          <p className="text-[11px] text-[#92400E] leading-relaxed">
                            سيُحدَّد السعر النهائي عند تجهيز الطلب والدفع كاش عند الاستلام
                          </p>
                        </div>
                      )}
                      <div className="space-y-1">
                        {freeItems.map((item) => {
                          const key = getItemKey(item);
                          return (
                            <div key={key} className="flex items-center gap-3 py-3 border-b border-[#F5F5F5] last:border-0">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-[#111]">{item.nameArSnapshot}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {item.priceSnapshot > 0 ? (
                                    <p className="text-[#111] text-sm font-black">{formatPrice(item.priceSnapshot)}</p>
                                  ) : (
                                    <p className="text-[#D97706] text-[11px] font-medium">{t('cart.estimatedPrice')}</p>
                                  )}
                                  <span className="text-[9px] bg-[#FEF3C7] text-[#D97706] px-1.5 py-0.5 rounded-full font-bold">
                                    {t('cart.freeBadge')}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 bg-[#F5F5F5] rounded-xl px-2 py-1.5">
                                <button onClick={() => updateQty(key, item.quantity - 1)} className="w-6 h-6 flex items-center justify-center rounded-lg">
                                  <Minus className="h-3 w-3 text-[#555]" />
                                </button>
                                <span className="text-sm font-black text-[#111] w-5 text-center">{item.quantity}</span>
                                <button onClick={() => updateQty(key, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center rounded-lg">
                                  <Plus className="h-3 w-3 text-[#555]" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Total */}
                  <div className="border-t border-[#F0F0F0] pt-4 mt-2">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[#999] text-sm">{t('cart.subtotal')}</span>
                      <span className="text-sm font-bold text-[#555]">{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-black text-[#111]">{t('cart.grandTotal')}</span>
                      <span className="font-black text-[#111] text-xl">{formatPrice(grandTotal)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* ── Checkout ── */
            <div className="px-5 py-4 space-y-6">
              {/* Personal info */}
              <div>
                <p className="text-[10px] font-black text-[#BBB] mb-3 tracking-widest uppercase">{t('cart.yourInfo')}</p>
                <div className="space-y-2.5">
                  <input
                    className="w-full bg-[#F5F5F5] border border-[#EBEBEB] rounded-xl px-4 py-3.5 text-sm text-[#111] placeholder:text-[#CCC] focus:outline-none focus:border-[#999] focus:bg-white transition-all"
                    placeholder={t('cart.fullName')}
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  />
                  <input
                    className="w-full bg-[#F5F5F5] border border-[#EBEBEB] rounded-xl px-4 py-3.5 text-sm text-[#111] placeholder:text-[#CCC] focus:outline-none focus:border-[#999] focus:bg-white transition-all"
                    placeholder={t('cart.mobileRequired')}
                    type="tel"
                    value={form.mobile}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  />
                </div>
              </div>

              {/* Vehicle */}
              {!isDineIn && (
                <div>
                  <p className="text-[10px] font-black text-[#BBB] mb-3 tracking-widest uppercase">{t('cart.vehicleInfo')}</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { key: 'make', placeholder: t('cart.brand') },
                      { key: 'model', placeholder: t('cart.carModel') },
                      { key: 'color', placeholder: t('cart.color') },
                      { key: 'plateNumber', placeholder: t('cart.plateNumber') },
                    ].map(({ key, placeholder }) => (
                      <input
                        key={key}
                        className="bg-[#F5F5F5] border border-[#EBEBEB] rounded-xl px-3 py-3 text-sm text-[#111] placeholder:text-[#CCC] focus:outline-none focus:border-[#999] focus:bg-white transition-all"
                        placeholder={placeholder}
                        value={(form as any)[key]}
                        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Payment */}
              <div>
                <p className="text-[10px] font-black text-[#BBB] mb-3 tracking-widest uppercase">{t('cart.paymentMethod')}</p>
                {forceCashPayment && (
                  <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-3 mb-3 flex gap-2.5">
                    <AlertCircle className="h-4 w-4 text-[#D97706] shrink-0 mt-0.5" />
                    <p className="text-[11px] text-[#92400E] leading-relaxed">{t('cart.cashOnly')}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {paymentOptions.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => !forceCashPayment && setForm({ ...form, paymentMethod: m.value })}
                      disabled={forceCashPayment && m.value !== PaymentMethod.CASH}
                      className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all duration-150 ${
                        form.paymentMethod === m.value
                          ? 'border-[#111] bg-[#111] text-white'
                          : 'border-[#EBEBEB] bg-white text-[#555]'
                      } ${forceCashPayment ? 'col-span-2' : ''}`}
                    >
                      {m.label}
                      {forceCashPayment && m.value === PaymentMethod.CASH && (
                        <span className="block text-[10px] mt-0.5 opacity-60">{t('cart.requiredForFreeItems')}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <p className="text-[10px] font-black text-[#BBB] mb-3 tracking-widest uppercase">ملاحظات</p>
                <textarea
                  className="w-full bg-[#F5F5F5] border border-[#EBEBEB] rounded-xl px-4 py-3 text-sm text-[#111] placeholder:text-[#CCC] focus:outline-none focus:border-[#999] focus:bg-white transition-all resize-none h-20"
                  placeholder={t('cart.notesPlaceholder')}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              {/* Summary */}
              <div className="bg-[#F8F8F8] border border-[#EBEBEB] rounded-2xl p-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#777] text-sm">{t('cart.grandTotal')}</span>
                  <span className="font-black text-[#111] text-xl">{formatPrice(grandTotal)}</span>
                </div>
                <p className="text-[11px] text-[#BBB] mt-1">
                  {catalogItems.length > 0 && `${catalogItems.length} من الكتالوج`}
                  {catalogItems.length > 0 && freeItems.length > 0 && ' · '}
                  {freeItems.length > 0 && `${freeItems.length} من القائمة الحرة`}
                </p>
              </div>

              <div className="h-4" />
            </div>
          )}
        </div>

        {/* Sticky CTA */}
        {items.length > 0 && (
          <div className="px-5 pb-8 pt-3 border-t border-[#F0F0F0] bg-white flex-shrink-0">
            {step === 'cart' ? (
              <button
                onClick={() => setStep('checkout')}
                className="w-full bg-[#111] text-white py-4 rounded-2xl font-black text-base active:scale-[0.98] transition-transform"
              >
                متابعة · {formatPrice(grandTotal)}
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={loading}
                className="w-full bg-[#111] text-white py-4 rounded-2xl font-black text-base disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : t('cart.confirmOrder')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
