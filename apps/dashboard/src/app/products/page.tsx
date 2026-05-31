'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from '@/components/Sidebar';
import toast from 'react-hot-toast';
import type { Product } from '@estlem/shared';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';

export default function ProductsPage() {
  const { storeId, staff } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!storeId || !staff?.tenantId) return;
    setLoading(true);
    try {
      const q = new URLSearchParams({ tenantId: staff.tenantId, limit: '200' });
      if (search) q.set('search', search);
      const data = await api.get(`/products/store/${storeId}?${q}`) as { items: Product[] };
      setProducts(data.items ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [storeId, staff?.tenantId]);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      if (editing.id) {
        await api.put(`/products/${editing.id}`, editing);
      } else {
        await api.post(`/products/store/${storeId}`, editing);
      }
      toast.success('تم الحفظ');
      setEditing(null);
      load();
    } catch {
      toast.error('فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (product: Product) => {
    await api.put(`/products/${product.id}`, { isActive: !product.isActive });
    setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, isActive: !p.isActive } : p));
  };

  return (
    <div className="flex min-h-screen" dir="rtl">
      <Sidebar />
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-foreground">المنتجات</h1>
          <Button onClick={() => setEditing({ isActive: true, stockQuantity: 0 })} className="gap-1">
            <Plus className="h-4 w-4" /> إضافة منتج
          </Button>
        </div>

        <div className="mb-4 max-w-md">
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); load(); }}
            placeholder="بحث عن منتج..."
          />
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="h-16 animate-pulse bg-muted/50 border-0" />
            ))}
          </div>
        ) : (
          <Card className="overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-secondary border-b border-border">
                <tr>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">المنتج</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">السعر</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">المخزون</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">الحالة</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{p.nameAr}</p>
                      <p className="text-muted-foreground text-xs">{p.name}</p>
                    </td>
                    <td className="px-4 py-3 font-bold text-primary">{formatPrice(p.price)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${p.stockQuantity === 0 ? 'text-destructive' : p.stockQuantity < 5 ? 'text-amber-500' : 'text-emerald-600'}`}>
                        {p.stockQuantity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActive(p)}>
                        <Badge variant={p.isActive ? 'success' : 'muted'}>
                          {p.isActive ? 'نشط' : 'معطل'}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="link" size="sm" onClick={() => setEditing(p)} className="text-xs h-auto p-0">تعديل</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {/* Edit modal */}
        {editing && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
              <h2 className="font-bold text-lg">{editing.id ? 'تعديل منتج' : 'إضافة منتج'}</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">الاسم بالعربي *</label>
                  <input className="input" value={editing.nameAr ?? ''} onChange={(e) => setEditing({ ...editing, nameAr: e.target.value })} placeholder="حليب كامل الدسم" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">الاسم بالإنجليزي *</label>
                  <input className="input" value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Full Fat Milk" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">السعر (ر.س) *</label>
                  <input type="number" className="input" value={editing.price ?? ''} onChange={(e) => setEditing({ ...editing, price: parseFloat(e.target.value) })} placeholder="0.00" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">الكمية</label>
                  <input type="number" className="input" value={editing.stockQuantity ?? 0} onChange={(e) => setEditing({ ...editing, stockQuantity: parseInt(e.target.value) })} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">سعر الخصم</label>
                  <input type="number" className="input" value={editing.salePrice ?? ''} onChange={(e) => setEditing({ ...editing, salePrice: parseFloat(e.target.value) || undefined })} placeholder="اختياري" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">SKU</label>
                  <input className="input" value={editing.sku ?? ''} onChange={(e) => setEditing({ ...editing, sku: e.target.value })} placeholder="اختياري" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setEditing(null)} className="flex-1 border border-gray-200 py-2.5 rounded-xl text-sm">إلغاء</button>
                <button onClick={save} disabled={saving} className="flex-1 bg-blue-900 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-60">
                  {saving ? '...' : 'حفظ'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <style jsx>{`.input { @apply w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400; }`}</style>
    </div>
  );
}
