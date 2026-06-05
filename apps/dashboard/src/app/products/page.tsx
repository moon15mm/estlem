'use client';

import { useEffect, useState, useMemo } from 'react';
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
import {
  Plus, Search, Package, Download, X, Check, ChevronDown,
  Grid3X3, List, AlertTriangle, TrendingUp, Archive, Loader2,
} from 'lucide-react';

interface CatalogItem {
  name: string;
  nameAr: string;
  price: number;
  sku: string;
}

interface CatalogCategory {
  category: string;
  categoryEn: string;
  icon: string;
  items: CatalogItem[];
}

type ViewMode = 'grid' | 'table';

export default function ProductsPage() {
  const { storeId, staff } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalog, setCatalog] = useState<CatalogCategory[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('');
  const [importing, setImporting] = useState<Set<string>>(new Set());
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [storeCategory, setStoreCategory] = useState<string>('grocery');

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

  // Load store category for catalog filtering
  useEffect(() => {
    if (!storeId) return;
    api.get(`/stores/${storeId}`).then((data: any) => {
      setStoreCategory(data?.category ?? 'grocery');
    }).catch(() => { /* ignore */ });
  }, [storeId]);

  const loadCatalog = async () => {
    setCatalogLoading(true);
    try {
      const q = new URLSearchParams();
      q.set('storeCategory', storeCategory);
      if (catalogSearch) q.set('search', catalogSearch);
      if (catalogCategory) q.set('category', catalogCategory);
      const data = await api.get(`/catalog?${q}`) as CatalogCategory[];
      setCatalog(data ?? []);
    } catch {
      toast.error('فشل تحميل الكتالوج');
    } finally {
      setCatalogLoading(false);
    }
  };

  useEffect(() => {
    if (showCatalog) loadCatalog();
  }, [showCatalog, catalogSearch, catalogCategory]);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const payload = {
        name: editing.name,
        nameAr: editing.nameAr,
        price: editing.price,
        salePrice: editing.salePrice || undefined,
        stockQuantity: editing.stockQuantity ?? 0,
        sku: editing.sku || undefined,
        imageUrl: editing.imageUrl || undefined,
        isActive: editing.isActive,
        categoryId: editing.categoryId || undefined,
      };
      if (editing.id) {
        await api.put(`/products/${editing.id}`, payload);
      } else {
        await api.post(`/products/store/${storeId}`, payload);
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

  const importFromCatalog = async (item: CatalogItem) => {
    setImporting((prev) => new Set(prev).add(item.sku));
    try {
      await api.post(`/products/store/${storeId}`, {
        name: item.name,
        nameAr: item.nameAr,
        price: item.price,
        sku: item.sku,
        stockQuantity: 0,
        isActive: true,
      });
      toast.success(`تم استيراد ${item.nameAr}`);
      load();
    } catch {
      toast.error(`فشل استيراد ${item.nameAr}`);
    } finally {
      setImporting((prev) => {
        const s = new Set(prev);
        s.delete(item.sku);
        return s;
      });
    }
  };

  const importCategory = async (cat: CatalogCategory) => {
    const skus = cat.items.map((i) => i.sku);
    setImporting((prev) => new Set([...prev, ...skus]));
    try {
      for (const item of cat.items) {
        const exists = products.some((p) => p.sku === item.sku);
        if (exists) continue;
        await api.post(`/products/store/${storeId}`, {
          name: item.name,
          nameAr: item.nameAr,
          price: item.price,
          sku: item.sku,
          stockQuantity: 0,
          isActive: true,
        });
      }
      toast.success(`تم استيراد قسم ${cat.category}`);
      load();
    } catch {
      toast.error('فشل الاستيراد');
    } finally {
      setImporting((prev) => {
        const s = new Set(prev);
        skus.forEach((sk) => s.delete(sk));
        return s;
      });
    }
  };

  const toggleActive = async (product: Product) => {
    await api.put(`/products/${product.id}`, { isActive: !product.isActive });
    setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, isActive: !p.isActive } : p));
  };

  const deleteProduct = async (id: string) => {
    try {
      await api.delete(`/products/${id}`);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setEditing(null);
      toast.success('تم حذف المنتج');
    } catch {
      toast.error('فشل الحذف');
    }
  };

  const stats = useMemo(() => ({
    total: products.length,
    active: products.filter((p) => p.isActive).length,
    lowStock: products.filter((p) => p.stockQuantity > 0 && p.stockQuantity < 5).length,
    outOfStock: products.filter((p) => p.stockQuantity === 0).length,
  }), [products]);

  const filtered = useMemo(() => {
    if (!search) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) => p.name?.toLowerCase().includes(q) || p.nameAr?.includes(q) || p.sku?.toLowerCase().includes(q),
    );
  }, [products, search]);

  return (
    <div className="flex min-h-screen bg-background" dir="rtl">
      <Sidebar />
      <main className="flex-1 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground">المنتجات</h1>
            <p className="text-muted-foreground text-sm">{stats.total} منتج</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowCatalog(true)} className="gap-2">
              <Download className="h-4 w-4" /> استيراد من الكتالوج
            </Button>
            <Button onClick={() => setEditing({ isActive: true, stockQuantity: 0 })} className="gap-2">
              <Plus className="h-4 w-4" /> إضافة منتج
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4 border-0 bg-gradient-to-br from-blue-50 to-blue-100/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-black text-blue-900">{stats.total}</p>
                <p className="text-xs text-blue-600">إجمالي المنتجات</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-0 bg-gradient-to-br from-emerald-50 to-emerald-100/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-black text-emerald-900">{stats.active}</p>
                <p className="text-xs text-emerald-600">منتجات نشطة</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-0 bg-gradient-to-br from-amber-50 to-amber-100/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-black text-amber-900">{stats.lowStock}</p>
                <p className="text-xs text-amber-600">مخزون منخفض</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-0 bg-gradient-to-br from-red-50 to-red-100/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <Archive className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-black text-red-900">{stats.outOfStock}</p>
                <p className="text-xs text-red-600">نفذ المخزون</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search + View toggle */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث عن منتج بالاسم أو SKU..."
              className="pr-10"
            />
          </div>
          <div className="flex border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2.5 transition-colors ${viewMode === 'grid' ? 'bg-primary text-white' : 'hover:bg-muted'}`}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2.5 transition-colors ${viewMode === 'table' ? 'bg-primary text-white' : 'hover:bg-muted'}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Products */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="h-48 animate-pulse bg-muted/50 border-0" />
            ))}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((p) => (
              <Card key={p.id} className="overflow-hidden hover:shadow-md transition-all group cursor-pointer" onClick={() => setEditing(p)}>
                <div className="h-32 bg-gradient-to-br from-secondary to-muted flex items-center justify-center relative">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.nameAr} className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <span className="text-4xl font-black text-primary/15">{p.nameAr?.charAt(0) ?? '?'}</span>
                  )}
                  <div className="absolute top-2 left-2">
                    <button onClick={(e) => { e.stopPropagation(); toggleActive(p); }}>
                      <Badge variant={p.isActive ? 'success' : 'muted'} className="text-[10px]">
                        {p.isActive ? 'نشط' : 'معطل'}
                      </Badge>
                    </button>
                  </div>
                  {p.salePrice && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="destructive" className="text-[10px]">خصم</Badge>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-bold text-sm text-foreground truncate">{p.nameAr}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.name}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      {p.salePrice ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-sm text-destructive">{formatPrice(p.salePrice)}</span>
                          <span className="text-[10px] text-muted-foreground line-through">{formatPrice(p.price)}</span>
                        </div>
                      ) : (
                        <span className="font-black text-sm text-primary">{formatPrice(p.price)}</span>
                      )}
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      p.stockQuantity === 0 ? 'bg-red-100 text-red-700' :
                      p.stockQuantity < 5 ? 'bg-amber-100 text-amber-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {p.stockQuantity === 0 ? 'نفذ' : p.stockQuantity}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 border-b border-border">
                <tr>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">المنتج</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">SKU</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">السعر</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">المخزون</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">الحالة</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{p.nameAr}</p>
                      <p className="text-muted-foreground text-xs">{p.name}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.sku || '—'}</td>
                    <td className="px-4 py-3">
                      {p.salePrice ? (
                        <div>
                          <span className="font-bold text-destructive">{formatPrice(p.salePrice)}</span>
                          <span className="text-[10px] text-muted-foreground line-through mr-1">{formatPrice(p.price)}</span>
                        </div>
                      ) : (
                        <span className="font-bold text-primary">{formatPrice(p.price)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${
                        p.stockQuantity === 0 ? 'text-destructive' :
                        p.stockQuantity < 5 ? 'text-amber-500' : 'text-emerald-600'
                      }`}>
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
                    <td className="px-4 py-3 flex gap-2">
                      <Button variant="link" size="sm" onClick={() => setEditing(p)} className="text-xs h-auto p-0">تعديل</Button>
                      <Button variant="link" size="sm" onClick={() => { if (confirm('حذف المنتج؟')) deleteProduct(p.id); }} className="text-xs h-auto p-0 text-destructive">حذف</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {/* Edit modal */}
        {editing && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="w-full max-w-lg p-0 overflow-hidden">
              <div className="bg-primary px-6 py-4 flex items-center justify-between">
                <h2 className="font-bold text-lg text-white">{editing.id ? 'تعديل منتج' : 'إضافة منتج جديد'}</h2>
                <button onClick={() => setEditing(null)} className="text-white/70 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">الاسم بالعربي *</label>
                    <Input value={editing.nameAr ?? ''} onChange={(e) => setEditing({ ...editing, nameAr: e.target.value })} placeholder="حليب كامل الدسم" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">الاسم بالإنجليزي *</label>
                    <Input value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Full Fat Milk" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">السعر (ر.س) *</label>
                    <Input type="number" step="0.01" min="0" inputMode="decimal" value={editing.price ?? ''} onChange={(e) => setEditing({ ...editing, price: parseFloat(e.target.value) })} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">الكمية</label>
                    <Input type="number" value={editing.stockQuantity ?? 0} onChange={(e) => setEditing({ ...editing, stockQuantity: parseInt(e.target.value) })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">سعر الخصم</label>
                    <Input type="number" step="0.01" min="0" inputMode="decimal" value={editing.salePrice ?? ''} onChange={(e) => setEditing({ ...editing, salePrice: parseFloat(e.target.value) || undefined })} placeholder="اختياري" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">SKU</label>
                    <Input value={editing.sku ?? ''} onChange={(e) => setEditing({ ...editing, sku: e.target.value })} placeholder="اختياري" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">رابط الصورة</label>
                    <Input value={editing.imageUrl ?? ''} onChange={(e) => setEditing({ ...editing, imageUrl: e.target.value })} placeholder="https://..." dir="ltr" />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => setEditing(null)} className="flex-1">إلغاء</Button>
                  <Button onClick={save} disabled={saving} className="flex-1">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'حفظ'}
                  </Button>
                </div>
                {editing.id && (
                  <button
                    onClick={() => { if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) deleteProduct(editing.id!); }}
                    className="w-full text-center text-destructive text-xs py-2 hover:underline"
                  >
                    حذف المنتج
                  </button>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Catalog import modal */}
        {showCatalog && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="w-full max-w-4xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
              <div className="bg-gradient-to-l from-primary to-brand-dark px-6 py-4 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="font-bold text-lg text-white">كتالوج المنتجات السعودية</h2>
                  <p className="text-white/60 text-xs">استورد منتجات شائعة بضغطة واحدة</p>
                </div>
                <button onClick={() => setShowCatalog(false)} className="text-white/70 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex items-center gap-3 p-4 border-b border-border shrink-0">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="بحث في الكتالوج..."
                    className="pr-10"
                  />
                </div>
                <select
                  value={catalogCategory}
                  onChange={(e) => setCatalogCategory(e.target.value)}
                  className="h-12 rounded-xl border border-input bg-background px-3 text-sm min-w-[160px]"
                >
                  <option value="">كل الأقسام</option>
                  {catalog.map((c) => (
                    <option key={c.category} value={c.category}>{c.icon} {c.category}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {catalogLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : catalog.length === 0 ? (
                  <p className="text-center text-muted-foreground py-20">لا توجد نتائج</p>
                ) : (
                  catalog.map((cat) => (
                    <div key={cat.category}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-foreground">{cat.category}</h3>
                          <Badge variant="muted" className="text-[10px]">{cat.items.length} منتج</Badge>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => importCategory(cat)}
                          className="gap-1 text-xs"
                        >
                          <Download className="h-3 w-3" /> استيراد الكل
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {cat.items.map((item) => {
                          const exists = products.some((p) => p.sku === item.sku);
                          const isImporting = importing.has(item.sku);
                          return (
                            <div
                              key={item.sku}
                              className={`border rounded-xl p-3 flex items-center gap-3 transition-all ${
                                exists ? 'bg-emerald-50 border-emerald-200' : 'border-border hover:border-primary/30 hover:shadow-sm'
                              }`}
                            >
                              <div className="w-12 h-12 bg-primary/5 rounded-lg flex items-center justify-center shrink-0">
                                <span className="text-2xl">{cat.icon}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{item.nameAr}</p>
                                <p className="text-xs text-muted-foreground">{formatPrice(item.price)}</p>
                              </div>
                              {exists ? (
                                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                  <Check className="h-4 w-4 text-emerald-600" />
                                </div>
                              ) : (
                                <button
                                  onClick={() => importFromCatalog(item)}
                                  disabled={isImporting}
                                  className="w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center shrink-0 transition-colors disabled:opacity-50"
                                >
                                  {isImporting ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                  ) : (
                                    <Plus className="h-4 w-4 text-primary" />
                                  )}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
