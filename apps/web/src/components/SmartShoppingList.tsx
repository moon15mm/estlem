'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface ParsedItem {
  text: string;
  matched: boolean;
  productId?: string;
  productName?: string;
  productNameAr?: string;
  price?: number;
  quantity: number;
}

interface SmartShoppingListProps {
  storeId: string;
  tenantId: string;
  onAddToCart: (items: ParsedItem[]) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export function SmartShoppingList({ storeId, tenantId, onAddToCart }: SmartShoppingListProps) {
  const [input, setInput] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const parseShoppingList = async () => {
    if (!input.trim()) return;
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/orders/ai-cart/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input, storeId, tenantId }),
      });

      if (res.ok) {
        const data = await res.json();
        setParsedItems(data.items || []);
        setShowResults(true);
      } else {
        // Fallback: simple splitting by + and ، and ,
        const rawItems = input.split(/[+،,\n]/).map(s => s.trim()).filter(Boolean);
        setParsedItems(rawItems.map(text => ({
          text,
          matched: false,
          quantity: 1,
        })));
        setShowResults(true);
      }
    } catch {
      const rawItems = input.split(/[+،,\n]/).map(s => s.trim()).filter(Boolean);
      setParsedItems(rawItems.map(text => ({ text, matched: false, quantity: 1 })));
      setShowResults(true);
    }

    setLoading(false);
  };

  const handleAddAll = () => {
    onAddToCart(parsedItems);
    setInput('');
    setParsedItems([]);
    setShowResults(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-4">
      <h3 className="font-bold text-lg mb-2 text-right">🛒 قائمة التسوق الذكية</h3>
      <p className="text-sm text-gray-500 text-right mb-3">
        اكتب ما تحتاجه وسنطابقه تلقائياً مع المنتجات
      </p>

      <div className="relative">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="مثال: ماء صحة صغير + كولا + شيبس ليز + خبز توست"
          className="w-full border rounded-xl p-3 text-right min-h-[80px] resize-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          dir="rtl"
        />
        <Button
          onClick={parseShoppingList}
          disabled={loading || !input.trim()}
          className="absolute bottom-3 left-3 bg-emerald-500 hover:bg-emerald-600 rounded-xl px-4 py-2 text-sm"
        >
          {loading ? (
            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full inline-block" />
          ) : (
            '✨ تحليل'
          )}
        </Button>
      </div>

      {showResults && parsedItems.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">{parsedItems.length} عنصر</span>
            <span className="text-xs text-gray-400">
              {parsedItems.filter(i => i.matched).length} متطابق / {parsedItems.filter(i => !i.matched).length} حر
            </span>
          </div>

          {parsedItems.map((item, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-between p-3 rounded-xl ${item.matched ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}
              dir="rtl"
            >
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${item.matched ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {item.matched ? '✓ متطابق' : '⊕ حر'}
                </span>
                <span className="font-medium text-sm">
                  {item.matched ? (item.productNameAr || item.productName) : item.text}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {item.price && (
                  <span className="text-sm text-emerald-600 font-bold">{item.price} ر.س</span>
                )}
                <div className="flex items-center gap-1 bg-white rounded-lg border px-2">
                  <button
                    onClick={() => {
                      const updated = [...parsedItems];
                      if (updated[idx].quantity > 1) updated[idx].quantity--;
                      setParsedItems(updated);
                    }}
                    className="text-gray-400 hover:text-gray-600 px-1"
                  >−</button>
                  <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                  <button
                    onClick={() => {
                      const updated = [...parsedItems];
                      updated[idx].quantity++;
                      setParsedItems(updated);
                    }}
                    className="text-gray-400 hover:text-gray-600 px-1"
                  >+</button>
                </div>
              </div>
            </div>
          ))}

          <Button onClick={handleAddAll} className="w-full bg-emerald-500 hover:bg-emerald-600 mt-3 rounded-xl h-12 text-base">
            إضافة الكل للسلة ({parsedItems.reduce((sum, i) => sum + i.quantity, 0)} عنصر)
          </Button>
        </div>
      )}
    </div>
  );
}
