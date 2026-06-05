'use client';

import { useState } from 'react';
import { X, Send, Loader2, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Order, OrderItem } from '@estlem/shared';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

interface Props {
  order: Order & { items: OrderItem[] };
  onClose: () => void;
  onSubmitted: () => void;
}

export function QuoteModal({ order, onClose, onSubmitted }: Props) {
  // Items that need pricing (priceSnapshot = 0)
  const unpricedItems = order.items.filter((i) => !i.priceSnapshot || Number(i.priceSnapshot) === 0);
  const pricedItems = order.items.filter((i) => Number(i.priceSnapshot) > 0);

  const [prices, setPrices] = useState<Record<string, string>>(
    Object.fromEntries(unpricedItems.map((i) => [i.id, ''])),
  );
  const [submitting, setSubmitting] = useState(false);

  const allFilled = unpricedItems.every((i) => prices[i.id] && parseFloat(prices[i.id]) > 0);

  const submit = async () => {
    if (!allFilled) {
      toast.error('أدخل سعر كل العناصر');
      return;
    }
    setSubmitting(true);
    try {
      await api.patch(`/orders/${order.id}/quote`, {
        items: Object.entries(prices).map(([itemId, price]) => ({
          itemId,
          price: parseFloat(price),
        })),
      });
      toast.success('تم إرسال السعر للعميل للموافقة');
      onSubmitted();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'فشل إرسال السعر');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate new totals preview
  const newSubtotal =
    pricedItems.reduce((s, i) => s + Number(i.priceSnapshot) * i.quantity, 0) +
    unpricedItems.reduce((s, i) => {
      const p = parseFloat(prices[i.id] || '0');
      return s + p * i.quantity;
    }, 0);
  // VAT disabled — merchants enter final prices (VAT-inclusive)
  const tax = 0;
  const total = newSubtotal;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4" dir="rtl">
      <Card className="w-full max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-b-none md:rounded-2xl">
        {/* Header */}
        <div className="bg-gradient-to-l from-amber-500 to-amber-600 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-black text-base">تسعير القائمة الحرة</h2>
              <p className="text-white/70 text-xs">طلب #{order.orderNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <p className="text-sm text-blue-900 font-medium">
              أدخل السعر النهائي لكل عنصر. سيُرسل للعميل للموافقة قبل التحضير.
            </p>
          </div>

          {/* Unpriced items */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-500">عناصر القائمة الحرة ({unpricedItems.length}):</p>
            {unpricedItems.map((item) => (
              <div key={item.id} className="border border-amber-200 bg-amber-50/30 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-sm text-gray-900">{item.nameArSnapshot}</p>
                  <span className="text-xs text-gray-500">الكمية: {item.quantity}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">سعر الوحدة (ر.س):</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={prices[item.id]}
                    onChange={(e) => setPrices((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    placeholder="0.00"
                    className="flex-1 h-9 text-center text-base font-bold"
                    autoFocus={unpricedItems[0]?.id === item.id}
                  />
                  {parseFloat(prices[item.id]) > 0 && (
                    <span className="text-xs font-bold text-emerald-600 shrink-0">
                      = {formatPrice(parseFloat(prices[item.id]) * item.quantity)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Already priced items */}
          {pricedItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-500">عناصر من الكتالوج ({pricedItems.length}):</p>
              {pricedItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between border border-border rounded-xl p-3 bg-gray-50">
                  <p className="text-sm">{item.nameArSnapshot}</p>
                  <span className="text-sm font-bold text-gray-700">
                    {formatPrice(Number(item.priceSnapshot) * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Totals preview */}
          <div className="bg-secondary rounded-xl p-4 space-y-1.5">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>المجموع</span>
              <span>{formatPrice(newSubtotal)}</span>
            </div>
            {/* VAT disabled — prices are entered VAT-inclusive */}
            <div className="flex justify-between font-black text-base pt-1.5 border-t">
              <span>الإجمالي للعميل</span>
              <span className="text-primary">{formatPrice(total)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 flex gap-2 shrink-0 bg-card">
          <Button variant="outline" onClick={onClose} className="flex-1">
            إلغاء
          </Button>
          <Button onClick={submit} disabled={!allFilled || submitting} className="flex-1 gap-2">
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            إرسال للعميل
          </Button>
        </div>
      </Card>
    </div>
  );
}
