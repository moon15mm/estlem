'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Activity, CheckCircle2, Clock3, CreditCard, RefreshCw, Search,
  ShieldCheck, X, Calendar, Loader2, AlertTriangle, Crown,
} from 'lucide-react';
import { ServicePlan, SERVICE_PLAN_META, SERVICE_PLAN_PRICE, SubscriptionStatus } from '@estlem/shared';
import { adminApi } from '@/lib/adminApi';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface SubscriptionRow {
  id: string;
  tenantId: string;
  plan: ServicePlan;
  status: SubscriptionStatus;
  startedAt: string;
  expiresAt: string;
  graceEndsAt: string | null;
  monthlyPrice: string | number;
  autoRenew: boolean;
  lastPaymentAt: string | null;
  lastPaymentAmount: string | number | null;
  createdAt: string;
  updatedAt: string;
}

interface TenantRef { id: string; name: string; slug?: string }

const STATUS_LABEL: Record<string, string> = {
  active: 'نشط',
  grace: 'فترة سماح',
  expired: 'منتهي',
  cancelled: 'ملغي',
  trial: 'تجريبي',
  past_due: 'متأخّر',
};
const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'muted' | 'default'> = {
  active: 'success',
  grace: 'warning',
  expired: 'destructive',
  cancelled: 'muted',
  trial: 'default',
  past_due: 'warning',
};

const PLAN_AR: Record<string, string> = {
  parking: SERVICE_PLAN_META.parking.nameAr,
  dine_in: SERVICE_PLAN_META.dine_in.nameAr,
  full: SERVICE_PLAN_META.full.nameAr,
};

const formatSAR = (v: number | string) =>
  new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 })
    .format(Number(v || 0));

const formatDate = (v: string | null) =>
  v ? new Intl.DateTimeFormat('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(v)) : '—';

const daysLeft = (iso: string) => {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export default function AdminSubscriptionsPage() {
  const { token } = useAdminAuth();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subs, setSubs] = useState<SubscriptionRow[]>([]);
  const [tenants, setTenants] = useState<Record<string, TenantRef>>({});
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | SubscriptionStatus>('all');
  const [filterPlan, setFilterPlan] = useState<'all' | ServicePlan>('all');
  const [editing, setEditing] = useState<SubscriptionRow | null>(null);
  const [sweepRunning, setSweepRunning] = useState(false);

  useEffect(() => {
    if (!useAdminAuth.getState().token) {
      window.location.href = '/admin/login';
    } else {
      setAuthChecked(true);
    }
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [subsData, tenantsData] = await Promise.all([
        adminApi.get('/service-subscriptions/admin/list'),
        adminApi.get('/tenants/admin/list'),
      ]);
      setSubs(subsData as unknown as SubscriptionRow[]);
      const map: Record<string, TenantRef> = {};
      (tenantsData as any[]).forEach((tnt) => { map[tnt.id] = { id: tnt.id, name: tnt.name, slug: tnt.slug }; });
      setTenants(map);
    } catch {
      toast.error('تعذّر تحميل الاشتراكات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (authChecked) load(); }, [authChecked]);

  const filtered = useMemo(() => {
    return subs.filter((s) => {
      if (filterStatus !== 'all' && s.status !== filterStatus) return false;
      if (filterPlan !== 'all' && s.plan !== filterPlan) return false;
      if (query) {
        const q = query.toLowerCase();
        const tnt = tenants[s.tenantId];
        if (!(tnt?.name?.toLowerCase().includes(q) || tnt?.slug?.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [subs, filterStatus, filterPlan, query, tenants]);

  const stats = useMemo(() => {
    const total = subs.length;
    const active = subs.filter((s) => s.status === 'active').length;
    const grace = subs.filter((s) => s.status === 'grace').length;
    const expired = subs.filter((s) => s.status === 'expired').length;
    const monthlyRevenue = subs
      .filter((s) => s.status === 'active')
      .reduce((sum, s) => sum + Number(s.monthlyPrice || 0), 0);
    return { total, active, grace, expired, monthlyRevenue };
  }, [subs]);

  const setPlan = async (tenantId: string, plan: ServicePlan, months: number) => {
    try {
      await adminApi.post(`/service-subscriptions/admin/${tenantId}/set-plan`, { plan, months });
      toast.success('تم تحديث الاشتراك');
      setEditing(null);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'فشل التحديث');
    }
  };

  const cancelSub = async (tenantId: string) => {
    if (!confirm('هل تريد إلغاء الاشتراك؟')) return;
    try {
      await adminApi.post(`/service-subscriptions/admin/${tenantId}/cancel`);
      toast.success('تم الإلغاء');
      await load();
    } catch {
      toast.error('فشل الإلغاء');
    }
  };

  const runSweep = async () => {
    setSweepRunning(true);
    try {
      const r = await adminApi.post('/service-subscriptions/admin/run-sweep');
      const { warned, toGrace, expired } = (r as any) ?? {};
      toast.success(`الفحص اكتمل: تنبيهات ${warned ?? 0} • إلى مهلة ${toGrace ?? 0} • منتهية ${expired ?? 0}`);
      await load();
    } catch {
      toast.error('فشل تشغيل الفحص');
    } finally {
      setSweepRunning(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground">إدارة الاشتراكات</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                مراقبة اشتراكات المحلات وتجديدها وإلغائها.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={runSweep} disabled={sweepRunning} className="gap-2">
              {sweepRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
              تشغيل فحص يومي
            </Button>
            <Button variant="outline" onClick={load} className="gap-2">
              <RefreshCw className="h-4 w-4" /> تحديث
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Stats */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Stat title="الإجمالي" value={stats.total.toLocaleString('ar-SA')} icon={CreditCard} tone="primary" />
          <Stat title="نشطة" value={stats.active.toLocaleString('ar-SA')} icon={CheckCircle2} tone="emerald" />
          <Stat title="فترة سماح" value={stats.grace.toLocaleString('ar-SA')} icon={AlertTriangle} tone="amber" />
          <Stat title="منتهية" value={stats.expired.toLocaleString('ar-SA')} icon={X} tone="red" />
          <Stat title="إيراد شهري" value={formatSAR(stats.monthlyRevenue)} icon={Crown} tone="violet" />
        </section>

        {/* Filters */}
        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle>الاشتراكات</CardTitle>
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="بحث بالمنشأة..."
                    className="h-10 w-full pr-9 sm:w-64"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="h-10 rounded-xl border bg-white px-3 text-sm"
                >
                  <option value="all">كل الحالات</option>
                  {Object.keys(STATUS_LABEL).map((k) => (
                    <option key={k} value={k}>{STATUS_LABEL[k]}</option>
                  ))}
                </select>
                <select
                  value={filterPlan}
                  onChange={(e) => setFilterPlan(e.target.value as any)}
                  className="h-10 rounded-xl border bg-white px-3 text-sm"
                >
                  <option value="all">كل الباقات</option>
                  {Object.values(ServicePlan).map((p) => (
                    <option key={p} value={p}>{PLAN_AR[p]}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-right text-sm">
                  <thead className="border-b bg-muted/60 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 font-bold">المنشأة</th>
                      <th className="px-5 py-3 font-bold">الباقة</th>
                      <th className="px-5 py-3 font-bold">الحالة</th>
                      <th className="px-5 py-3 font-bold">السعر</th>
                      <th className="px-5 py-3 font-bold">ينتهي</th>
                      <th className="px-5 py-3 font-bold">أيام متبقية</th>
                      <th className="px-5 py-3 font-bold">آخر دفعة</th>
                      <th className="px-5 py-3 text-center font-bold">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filtered.map((s) => {
                      const tnt = tenants[s.tenantId];
                      const days = daysLeft(s.expiresAt);
                      const isWarning = s.status === 'active' && days <= 7;
                      return (
                        <tr key={s.id} className="bg-white hover:bg-muted/40">
                          <td className="px-5 py-3">
                            <div className="font-bold">{tnt?.name ?? '—'}</div>
                            {tnt?.slug && <div className="text-xs text-muted-foreground" dir="ltr">/{tnt.slug}</div>}
                          </td>
                          <td className="px-5 py-3">
                            <Badge variant="default">{PLAN_AR[s.plan]}</Badge>
                          </td>
                          <td className="px-5 py-3">
                            <Badge variant={STATUS_VARIANT[s.status] ?? 'muted'}>{STATUS_LABEL[s.status] ?? s.status}</Badge>
                            {s.status === 'grace' && s.graceEndsAt && (
                              <div className="mt-1 text-[10px] text-amber-600">تنتهي المهلة {formatDate(s.graceEndsAt)}</div>
                            )}
                          </td>
                          <td className="px-5 py-3 font-bold">{formatSAR(s.monthlyPrice)}</td>
                          <td className="px-5 py-3 text-muted-foreground">{formatDate(s.expiresAt)}</td>
                          <td className="px-5 py-3">
                            {s.status === 'active' && (
                              <span className={cn(
                                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold',
                                days <= 3 ? 'bg-red-100 text-red-700' : days <= 7 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700',
                              )}>
                                <Clock3 className="h-3 w-3" /> {days.toLocaleString('ar-SA')}
                              </span>
                            )}
                            {s.status === 'grace' && <span className="text-xs text-amber-600">في فترة السماح</span>}
                          </td>
                          <td className="px-5 py-3 text-xs text-muted-foreground">
                            {s.lastPaymentAt ? (
                              <>
                                {formatDate(s.lastPaymentAt)}
                                <div className="font-bold text-foreground">{formatSAR(s.lastPaymentAmount ?? 0)}</div>
                              </>
                            ) : '—'}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex justify-center gap-2">
                              <Button size="sm" variant="outline" onClick={() => setEditing(s)}>تعديل/تجديد</Button>
                              {(s.status === 'active' || s.status === 'grace') && (
                                <Button size="sm" variant="outline" className="text-red-600" onClick={() => cancelSub(s.tenantId)}>
                                  إلغاء
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {!filtered.length && (
                      <tr>
                        <td colSpan={8} className="px-5 py-16">
                          <div className="mx-auto max-w-sm text-center">
                            <CreditCard className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
                            <h3 className="font-bold">لا توجد اشتراكات</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                              لم يشترك أي محل بعد، أو لا توجد نتائج مطابقة للفلتر.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* New / Manual subscribe — quick form for tenants without a subscription */}
        <Card>
          <CardHeader>
            <CardTitle>إنشاء اشتراك يدوي</CardTitle>
            <p className="text-xs text-muted-foreground">اختر منشأة وباقة وعدد الأشهر — يعمل أيضاً كتجديد فوري.</p>
          </CardHeader>
          <CardContent>
            <NewSubForm tenants={Object.values(tenants)} onSubmit={setPlan} />
          </CardContent>
        </Card>
      </main>

      {/* Edit modal */}
      {editing && (
        <EditModal
          row={editing}
          tenantName={tenants[editing.tenantId]?.name ?? '—'}
          onClose={() => setEditing(null)}
          onSubmit={(plan, months) => setPlan(editing.tenantId, plan, months)}
        />
      )}
    </div>
  );
}

function Stat({ title, value, icon: Icon, tone }: {
  title: string; value: string; icon: typeof Activity;
  tone: 'primary' | 'emerald' | 'amber' | 'red' | 'violet';
}) {
  const toneClass = {
    primary: 'bg-primary/10 text-primary',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
    violet: 'bg-violet-100 text-violet-700',
  }[tone];
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-black text-foreground">{value}</p>
        </div>
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', toneClass)}>
          <Icon className="h-6 w-6" />
        </div>
      </CardContent>
    </Card>
  );
}

function PlanCard({ plan, selected, onClick }: {
  plan: ServicePlan; selected: boolean; onClick: () => void;
}) {
  const meta = SERVICE_PLAN_META[plan];
  const price = SERVICE_PLAN_PRICE[plan];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl border p-4 text-right transition',
        selected ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border hover:border-primary/30',
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold">{meta.nameAr}</span>
        <span className="font-black text-primary">{price} ر.س</span>
      </div>
      <div className="text-xs text-muted-foreground">
        {meta.includes.includes('drive_through') && '✓ السيارة '}
        {meta.includes.includes('dine_in') && '✓ الطاولة'}
      </div>
    </button>
  );
}

function NewSubForm({ tenants, onSubmit }: {
  tenants: TenantRef[]; onSubmit: (tid: string, plan: ServicePlan, months: number) => void;
}) {
  const [tenantId, setTenantId] = useState('');
  const [plan, setPlan] = useState<ServicePlan>(ServicePlan.PARKING);
  const [months, setMonths] = useState(1);

  const submit = () => {
    if (!tenantId) { toast.error('اختر منشأة'); return; }
    onSubmit(tenantId, plan, months);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="text-xs font-bold mb-1.5 block">المنشأة</label>
          <select
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            className="h-11 w-full rounded-xl border bg-white px-3 text-sm"
          >
            <option value="">— اختر —</option>
            {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold mb-1.5 block">عدد الأشهر</label>
          <select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="h-11 w-full rounded-xl border bg-white px-3 text-sm"
          >
            {[1, 3, 6, 12].map((m) => <option key={m} value={m}>{m} {m === 1 ? 'شهر' : 'أشهر'}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-bold mb-2 block">الباقة</label>
        <div className="grid gap-3 sm:grid-cols-3">
          {Object.values(ServicePlan).map((p) => (
            <PlanCard key={p} plan={p} selected={plan === p} onClick={() => setPlan(p)} />
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center pt-2 border-t">
        <div className="text-sm">
          <span className="text-muted-foreground">المجموع: </span>
          <span className="font-black text-primary">{(SERVICE_PLAN_PRICE[plan] * months).toLocaleString('ar-SA')} ر.س</span>
        </div>
        <Button onClick={submit} className="gap-2">
          <CheckCircle2 className="h-4 w-4" /> تفعيل الاشتراك
        </Button>
      </div>
    </div>
  );
}

function EditModal({ row, tenantName, onClose, onSubmit }: {
  row: SubscriptionRow; tenantName: string; onClose: () => void;
  onSubmit: (plan: ServicePlan, months: number) => void;
}) {
  const [plan, setPlan] = useState<ServicePlan>(row.plan);
  const [months, setMonths] = useState(1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      onClick={onClose}
      dir="rtl"
    >
      <Card className="max-h-[85vh] w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b p-5">
          <div>
            <h2 className="text-lg font-black">تعديل اشتراك</h2>
            <p className="mt-1 text-xs text-muted-foreground">{tenantName}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        <CardContent className="space-y-4 p-5">
          <div className="text-sm text-muted-foreground">
            ينتهي حالياً: <span className="font-bold text-foreground">{formatDate(row.expiresAt)}</span>
          </div>

          <div>
            <label className="text-xs font-bold mb-2 block">الباقة</label>
            <div className="grid gap-3 sm:grid-cols-3">
              {Object.values(ServicePlan).map((p) => (
                <PlanCard key={p} plan={p} selected={plan === p} onClick={() => setPlan(p)} />
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold mb-1.5 block">إضافة أشهر</label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 3, 6, 12].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMonths(m)}
                  className={cn(
                    'h-11 rounded-xl border text-sm font-bold transition',
                    months === m ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/30',
                  )}
                >
                  + {m}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
            <Calendar className="h-3.5 w-3.5 inline ml-1" />
            سيتم تمديد التاريخ ليصبح: <b>
              {(() => {
                const d = new Date(Math.max(new Date(row.expiresAt).getTime(), Date.now()));
                d.setMonth(d.getMonth() + months);
                return formatDate(d.toISOString());
              })()}
            </b>
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <Button variant="outline" className="flex-1" onClick={onClose}>إلغاء</Button>
            <Button className="flex-1 gap-2" onClick={() => onSubmit(plan, months)}>
              <CheckCircle2 className="h-4 w-4" /> حفظ ({SERVICE_PLAN_PRICE[plan] * months} ر.س)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
