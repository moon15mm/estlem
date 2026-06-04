'use client';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  billingEmail: string;
  createdAt: string;
  stores?: { id: string; name: string }[];
  staff?: { id: string; name: string; role: string }[];
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500', trial: 'bg-blue-500', suspended: 'bg-red-500', cancelled: 'bg-gray-500',
};
const statusLabels: Record<string, string> = {
  active: 'فعال', trial: 'تجريبي', suspended: 'معلّق', cancelled: 'ملغي',
};
const planLabels: Record<string, string> = {
  starter: 'المبتدئ', growth: 'النمو', business: 'الأعمال', enterprise: 'المؤسسات',
};

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  const getToken = () => {
    try { return JSON.parse(localStorage.getItem('admin-auth') || '{}').state?.token; } catch { return null; }
  };
  const headers = () => ({ Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' });

  const loadTenants = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (filterStatus) params.set('status', filterStatus);
      const res = await fetch(`${API}/admin/tenants?${params}`, { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        setTenants(data.tenants || data);
        setTotal(data.total || 0);
      }
    } catch { }
    setLoading(false);
  };

  useEffect(() => { loadTenants(); }, [page, filterStatus]);

  const updateStatus = async (id: string, status: string) => {
    await fetch(`${API}/admin/tenants/${id}/status`, {
      method: 'PATCH', headers: headers(), body: JSON.stringify({ status }),
    });
    loadTenants();
    if (selectedTenant?.id === id) setSelectedTenant(null);
  };

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">إدارة المتاجر</h1>
          <p className="text-gray-500">إجمالي {total} متجر مسجّل</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        {['', 'active', 'trial', 'suspended', 'cancelled'].map(s => (
          <button
            key={s}
            onClick={() => { setFilterStatus(s); setPage(1); }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${filterStatus === s ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {s === '' ? 'الكل' : statusLabels[s] || s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* Tenants table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">المتجر</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">الباقة</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">الحالة</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">تاريخ التسجيل</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {tenants.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedTenant(t)}>
                      <td className="px-4 py-3">
                        <p className="font-medium">{t.name}</p>
                        <p className="text-xs text-gray-400">{t.slug}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{planLabels[t.plan] || t.plan}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`${statusColors[t.status] || 'bg-gray-500'} text-white`}>
                          {statusLabels[t.status] || t.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(t.createdAt).toLocaleDateString('ar-SA')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {t.status !== 'active' && (
                            <Button size="sm" className="bg-emerald-500 text-xs" onClick={e => { e.stopPropagation(); updateStatus(t.id, 'active'); }}>
                              تفعيل
                            </Button>
                          )}
                          {t.status === 'active' && (
                            <Button size="sm" variant="outline" className="text-xs text-red-500" onClick={e => { e.stopPropagation(); updateStatus(t.id, 'suspended'); }}>
                              تعليق
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pagination */}
          <div className="flex justify-center gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>السابق</Button>
            <span className="px-4 py-2 text-sm">صفحة {page}</span>
            <Button size="sm" variant="outline" onClick={() => setPage(p => p + 1)}>التالي</Button>
          </div>
        </>
      )}

      {/* Tenant detail modal */}
      {selectedTenant && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelectedTenant(null)}>
          <Card className="w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">{selectedTenant.name}</h2>
              <button onClick={() => setSelectedTenant(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="space-y-3">
              <p><span className="text-gray-500">Slug:</span> {selectedTenant.slug}</p>
              <p><span className="text-gray-500">الباقة:</span> {planLabels[selectedTenant.plan] || selectedTenant.plan}</p>
              <p><span className="text-gray-500">الحالة:</span> <Badge className={`${statusColors[selectedTenant.status]} text-white`}>{statusLabels[selectedTenant.status]}</Badge></p>
              <p><span className="text-gray-500">البريد:</span> {selectedTenant.billingEmail || '—'}</p>
              <p><span className="text-gray-500">تاريخ التسجيل:</span> {new Date(selectedTenant.createdAt).toLocaleDateString('ar-SA')}</p>
              {selectedTenant.stores && selectedTenant.stores.length > 0 && (
                <div>
                  <p className="text-gray-500 mb-1">الفروع ({selectedTenant.stores.length}):</p>
                  <ul className="list-disc list-inside text-sm">{selectedTenant.stores.map(s => <li key={s.id}>{s.name}</li>)}</ul>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-6">
              {selectedTenant.status !== 'active' && (
                <Button className="bg-emerald-500 flex-1" onClick={() => updateStatus(selectedTenant.id, 'active')}>تفعيل</Button>
              )}
              {selectedTenant.status === 'active' && (
                <Button variant="outline" className="text-red-500 flex-1" onClick={() => updateStatus(selectedTenant.id, 'suspended')}>تعليق</Button>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
