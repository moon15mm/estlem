'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useCart, type CartItem } from '@/hooks/useCart';
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

export function FreeTextModal({ open, onClose, storeId }: Props) {
  const { addFreeTextItems, itemCount } = useCart();
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<ParsedItem[]>([]);
  const [parsing, setParsing] = useState(false);
  const [step, setStep] = useState<'input' | 'confirm'>('input');

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

  const addToCart = () => {
    const cartItems: CartItem[] = parsed.map((p) => ({
      productId: p.productId,
      nameSnapshot: p.name,
      nameArSnapshot: p.nameAr,
      priceSnapshot: p.price,
      quantity: p.quantity,
      isFreeText: !p.productId,
    }));
    addFreeTextItems(cartItems, text);

    const count = parsed.reduce((s, p) => s + p.quantity, 0);
    toast.success(`تمت إضافة ${count} عنصر للسلة`);

    // Reset and close
    setText('');
    setParsed([]);
    setStep('input');
    onClose();
  };

  const removeItem = (index: number) => {
    setParsed((prev) => prev.filter((_, i) => i !== index));
  };

  const updateQty = (index: number, qty: number) => {
    if (qty < 1) return removeItem(index);
    setParsed((prev) => prev.map((p, i) => i === index ? { ...p, quantity: qty } : p));
  };

  if (!open) return null;

  const parsedTotal = parsed.reduce((s, p) => s + p.price * p.quantity, 0);

  return (
    <div className="fixed inset-0 z-50" dir="rtl">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">✨ قائمة التسوق الذكية</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl">&times;</button>
        </div>

        {itemCount() > 0 && (
          <div className="bg-blue-50 rounded-xl p-3 mb-4 text-sm text-blue-800">
            عندك <strong>{itemCount()}</strong> عنصر في السلة — العناصر الجديدة ستُضاف معها
          </div>
        )}

        {step === 'input' && (
          <>
            <p className="text-gray-500 text-sm mb-3">
              اكتب قائمة مشترياتك بحرية — سنحللها ونضيفها للسلة مع المنتجات اللي اخترتها
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
            <p className="text-sm text-gray-500 mb-3">راجع العناصر — يمكنك تعديل الكمية أو حذف عنصر:</p>
            <div className="space-y-2 mb-4">
              {parsed.map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.nameAr}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.price > 0 && (
                        <span className="text-blue-700 text-xs font-bold">{formatPrice(item.price)}</span>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        item.productId ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {item.productId ? '✓ مطابق' : 'حر'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-full px-1 py-0.5">
                    <button onClick={() => updateQty(i, item.quantity - 1)}
                      className="w-7 h-7 flex items-center justify-center text-gray-500 font-bold">−</button>
                    <span className="text-sm font-bold w-5 text-center">{item.quantity}</span>
                    <button onClick={() => updateQty(i, item.quantity + 1)}
                      className="w-7 h-7 flex items-center justify-center text-gray-500 font-bold">+</button>
                  </div>
                  <button onClick={() => removeItem(i)} className="text-red-400 text-lg">×</button>
                </div>
              ))}
            </div>

            {parsedTotal > 0 && (
              <div className="bg-gray-50 rounded-xl p-3 flex justify-between mb-4 text-sm">
                <span className="text-gray-500">مجموع العناصر الجديدة</span>
                <span className="font-bold text-blue-900">{formatPrice(parsedTotal)}</span>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => setStep('input')} className="flex-1 border border-gray-200 py-3 rounded-xl text-sm">
                ← تعديل النص
              </button>
              <button
                onClick={addToCart}
                disabled={parsed.length === 0}
                className="flex-1 bg-blue-900 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-50"
              >
                إضافة للسلة 🛒
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
