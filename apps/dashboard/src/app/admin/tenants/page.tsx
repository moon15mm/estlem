'use client';
import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAdminAuth } from '@/hooks/useAdminAuth';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  billingEmail: string;
  trialEndsAt?: string | null;
  createdAt: string;
  stores?: { id: string; name: string }[];
  staff?: { id: string; name: string; role: string; mobile?: string }[];
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
const PLANS = ['starter', 'growth', 'business', 'enterprise'];
const STATUSES = ['active', 'trial', 'suspended', 'cancelled'];

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [deleting, setDeleting] = useState<Tenant | null>(null);
  const [extending, setExtending] = useState<Tenant | null>(null);

  const token = useAdminAuth((s) => s.token);
  const headers = () => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });

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

  useEffect(() => { if (token) loadTenants(); }, [page, filterStatus, token]);

  // close menu on outside click
  useEffect(() => {
    const handler = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener('click', handler);
      return () => document.removeEventListener('click', handler);
    }
  }, [openMenuId]);

  const updateStatus = async (id: string, status: string) => {
    await fetch(`${API}/admin/tenants/${id}/status`, {
      method: 'PATCH', headers: headers(), body: JSON.stringify({ status }),
    });
    loadTenants();
    if (selectedTenant?.id === id) setSelectedTenant(null);
  };

  const saveEdit = async (patch: Partial<Tenant>) => {
    if (!editing) return;
    const res = await fetch(`${API}/admin/tenants/${editing.id}`, {
      method: 'PATCH', headers: headers(), body: JSON.stringify(patch),
    });
    if (res.ok) {
      setEditing(null);
      loadTenants();
    } else {
      alert('فشل حفظ التغييرات');
    }
  };

  const doDelete = async () => {
    if (!deleting) return;
    const res = await fetch(`${API}/admin/tenants/${deleting.id}`, {
      method: 'DELETE', headers: headers(),
    });
    if (res.ok) {
      setDeleting(null);
      loadTenants();
    } else {
      alert('فشل الحذف — تأكد أن المنشأة لا تحوي بيانات مرتبطة');
    }
  };

  const doExtend = async (days: number) => {
    if (!extending) return;
    const res = await fetch(`${API}/admin/tenants/${extending.id}/extend-trial`, {
      method: 'PATCH', headers: headers(), body: JSON.stringify({ days }),
    });
    if (res.ok) {
      setExtending(null);
      loadTenants();
    } else {
      alert('فشل تمديد التجربة');
    }
  };

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">إدارة المنشآت</h1>
          <p className="text-gray-500">إجمالي {total} منشأة مسجّلة</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        {['', ...STATUSES].map(s => (
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
          <Card className="overflow-visible">
            <div className="overflow-x-auto overflow-y-visible">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">المنشأة</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">الباقة</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">الحالة</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">الفروع</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">المالك</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">تاريخ التسجيل</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {tenants.map(t => {
                    const owner = (t.staff || []).find(s => s.role === 'owner') || (t.staff || [])[0];
                    return (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 cursor-pointer" onClick={() => setSelectedTenant(t)}>
                          <p className="font-medium">{t.name}</p>
                          <p className="text-xs text-gray-400">/{t.slug} · {t.billingEmail || '—'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{planLabels[t.plan] || t.plan}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={`${statusColors[t.status] || 'bg-gray-500'} text-white`}>
                            {statusLabels[t.status] || t.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">{t.stores?.length ?? 0}</td>
                        <td className="px-4 py-3 text-sm">
                          {owner ? (<div><div>{owner.name}</div><div className="text-xs text-gray-400">{owner.mobile || ''}</div></div>) : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {new Date(t.createdAt).toLocaleDateString('ar-SA')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {t.status === 'active' ? (
                              <Button size="sm" variant="outline" className="text-xs text-red-500" onClick={() => updateStatus(t.id, 'suspended')}>
                                ⏸ تعليق
                              </Button>
                            ) : (
                              <Button size="sm" className="bg-emerald-500 text-white text-xs" onClick={() => updateStatus(t.id, 'active')}>
                                ✓ تفعيل
                              </Button>
                            )}

                            {/* 3-dot menu */}
                            <div className="relative">
                              <button
                                onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === t.id ? null : t.id); }}
                                className="p-2 hover:bg-gray-100 rounded-full"
                                aria-label="إجراءات"
                              >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
                              </button>
                              {openMenuId === t.id && (
                                <div
                                  className="absolute left-0 top-full mt-1 w-56 bg-white border rounded-lg shadow-lg z-20 py-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MenuItem icon="✏️" onClick={() => { setEditing(t); setOpenMenuId(null); }}>تعديل البيانات</MenuItem>
                                  <MenuItem icon="📦" onClick={() => { setEditing({ ...t }); setOpenMenuId(null); }}>تغيير الباقة</MenuItem>
                                  {(t.status === 'trial' || t.trialEndsAt) && (
                                    <MenuItem icon="⏰" onClick={() => { setExtending(t); setOpenMenuId(null); }}>تمديد التجربة</MenuItem>
                                  )}
                                  <MenuItem icon="🔄" onClick={() => { updateStatus(t.id, t.status === 'active' ? 'suspended' : 'active'); setOpenMenuId(null); }}>
                                    {t.status === 'active' ? 'تعليق' : 'تفعيل'}
                                  </MenuItem>
                                  <MenuItem icon="👁️" onClick={() => { setSelectedTenant(t); setOpenMenuId(null); }}>عرض التفاصيل</MenuItem>
                                  <div className="border-t my-1" />
                                  <MenuItem icon="🗑️" danger onClick={() => { setDeleting(t); setOpenMenuId(null); }}>حذف المنشأة</MenuItem>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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

      {/* Detail modal */}
      {selectedTenant && (
        <Modal onClose={() => setSelectedTenant(null)} title={selectedTenant.name}>
          <div className="space-y-3">
            <Row label="Slug" value={selectedTenant.slug} />
            <Row label="الباقة" value={planLabels[selectedTenant.plan] || selectedTenant.plan} />
            <Row label="الحالة" value={<Badge className={`${statusColors[selectedTenant.status]} text-white`}>{statusLabels[selectedTenant.status]}</Badge>} />
            <Row label="البريد" value={selectedTenant.billingEmail || '—'} />
            <Row label="تاريخ التسجيل" value={new Date(selectedTenant.createdAt).toLocaleDateString('ar-SA')} />
            {selectedTenant.trialEndsAt && <Row label="انتهاء التجربة" value={new Date(selectedTenant.trialEndsAt).toLocaleDateString('ar-SA')} />}
            {selectedTenant.stores && selectedTenant.stores.length > 0 && (
              <div>
                <p className="text-gray-500 mb-1">الفروع ({selectedTenant.stores.length}):</p>
                <ul className="list-disc list-inside text-sm">{selectedTenant.stores.map(s => <li key={s.id}>{s.name}</li>)}</ul>
              </div>
            )}
            {selectedTenant.staff && selectedTenant.staff.length > 0 && (
              <div>
                <p className="text-gray-500 mb-1">الموظفون ({selectedTenant.staff.length}):</p>
                <ul className="list-disc list-inside text-sm">{selectedTenant.staff.map(s => <li key={s.id}>{s.name} — {s.role}</li>)}</ul>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Edit modal */}
      {editing && (
        <EditTenantModal
          tenant={editing}
          onCancel={() => setEditing(null)}
          onSave={saveEdit}
        />
      )}

      {/* Extend trial modal */}
      {extending && (
        <Modal onClose={() => setExtending(null)} title={`تمديد التجربة — ${extending.name}`}>
          <p className="text-sm text-gray-600 mb-4">
            ينتهي الآن: {extending.trialEndsAt ? new Date(extending.trialEndsAt).toLocaleDateString('ar-SA') : 'غير محدد'}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[7, 14, 30].map(d => (
              <Button key={d} className="bg-emerald-500" onClick={() => doExtend(d)}>+ {d} يوم</Button>
            ))}
          </div>
        </Modal>
      )}

      {/* Delete confirmation */}
      {deleting && (
        <Modal onClose={() => setDeleting(null)} title="تأكيد الحذف">
          <p className="text-sm text-gray-700 mb-2">
            هل أنت متأكد من حذف <b>{deleting.name}</b>؟
          </p>
          <p className="text-xs text-red-500 mb-4">
            سيتم حذف كل البيانات المرتبطة (فروع، موظفين، طلبات). لا يمكن التراجع.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleting(null)}>إلغاء</Button>
            <Button className="bg-red-500 text-white flex-1" onClick={doDelete}>نعم، احذف</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function MenuItem({ icon, children, onClick, danger }: { icon: string; children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-right px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-3 ${danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'}`}
    >
      <span>{icon}</span> {children}
    </button>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return <p><span className="text-gray-500">{label}:</span> {value}</p>;
}

function Modal({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <Card className="w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        {children}
      </Card>
    </div>
  );
}

function EditTenantModal({ tenant, onCancel, onSave }: { tenant: Tenant; onCancel: () => void; onSave: (patch: Partial<Tenant>) => void }) {
  const [name, setName] = useState(tenant.name);
  const [slug, setSlug] = useState(tenant.slug);
  const [billingEmail, setBillingEmail] = useState(tenant.billingEmail || '');
  const [plan, setPlan] = useState(tenant.plan);
  const [status, setStatus] = useState(tenant.status);

  return (
    <Modal onClose={onCancel} title={`تعديل — ${tenant.name}`}>
      <div className="space-y-3">
        <Field label="اسم المنشأة"><Input value={name} onChange={e => setName(e.target.value)} /></Field>
        <Field label="Slug"><Input value={slug} onChange={e => setSlug(e.target.value)} /></Field>
        <Field label="البريد"><Input type="email" value={billingEmail} onChange={e => setBillingEmail(e.target.value)} /></Field>
        <Field label="الباقة">
          <select value={plan} onChange={e => setPlan(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm">
            {PLANS.map(p => <option key={p} value={p}>{planLabels[p]}</option>)}
          </select>
        </Field>
        <Field label="الحالة">
          <select value={status} onChange={e => setStatus(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm">
            {STATUSES.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
          </select>
        </Field>
      </div>
      <div className="flex gap-2 mt-6">
        <Button variant="outline" className="flex-1" onClick={onCancel}>إلغاء</Button>
        <Button className="bg-emerald-500 flex-1" onClick={() => onSave({ name, slug, billingEmail, plan: plan as any, status: status as any })}>
          حفظ التغييرات
        </Button>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
