'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronLeft,
  CreditCard,
  Mail,
  MoreHorizontal,
  PauseCircle,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  User,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { StoreCategory, TenantPlan, TenantStatus } from '@estlem/shared';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface TenantItem {
  id: string;
  name: string;
  slug: string;
  plan: TenantPlan;
  status: TenantStatus;
  billingEmail?: string;
  createdAt: string;
  stores?: Array<{ id: string; name: string; nameAr?: string }>;
  staff?: Array<{ id: string; name: string; role: string; mobile: string }>;
}

interface StatsData {
  tenantsCount: number;
  storesCount: number;
  ordersCount: number;
  totalRevenue: number;
  statusDistribution: Record<string, number>;
  planDistribution: Record<string, number>;
}

type WizardStep = 1 | 2 | 3;

const EMPTY_STATS: StatsData = {
  tenantsCount: 0,
  storesCount: 0,
  ordersCount: 0,
  totalRevenue: 0,
  statusDistribution: {},
  planDistribution: {},
};

const PLAN_LABELS: Record<TenantPlan, string> = {
  [TenantPlan.STARTER]: 'Starter',
  [TenantPlan.GROWTH]: 'Growth',
  [TenantPlan.BUSINESS]: 'Business',
  [TenantPlan.ENTERPRISE]: 'Enterprise',
};

const PLAN_AR_LABELS: Record<TenantPlan, string> = {
  [TenantPlan.STARTER]: 'الأساسية',
  [TenantPlan.GROWTH]: 'النمو',
  [TenantPlan.BUSINESS]: 'الأعمال',
  [TenantPlan.ENTERPRISE]: 'المؤسسات',
};

const PLAN_COLORS: Record<TenantPlan, string> = {
  [TenantPlan.STARTER]: '#1B4F72',
  [TenantPlan.GROWTH]: '#16A34A',
  [TenantPlan.BUSINESS]: '#7C3AED',
  [TenantPlan.ENTERPRISE]: '#D97706',
};

const STATUS_LABELS: Record<TenantStatus, string> = {
  [TenantStatus.TRIAL]: 'تجريبي',
  [TenantStatus.ACTIVE]: 'نشط',
  [TenantStatus.SUSPENDED]: 'معلق',
  [TenantStatus.CANCELLED]: 'ملغي',
};

const STATUS_META: Record<
  TenantStatus,
  { badge: 'default' | 'success' | 'warning' | 'destructive' | 'muted'; color: string }
> = {
  [TenantStatus.TRIAL]: { badge: 'default', color: '#1B4F72' },
  [TenantStatus.ACTIVE]: { badge: 'success', color: '#16A34A' },
  [TenantStatus.SUSPENDED]: { badge: 'warning', color: '#D97706' },
  [TenantStatus.CANCELLED]: { badge: 'destructive', color: '#DC2626' },
};

const CATEGORY_LABELS: Record<StoreCategory, string> = {
  [StoreCategory.GROCERY]: 'تموينات / سوبرماركت',
  [StoreCategory.PHARMACY]: 'صيدلية',
  [StoreCategory.RESTAURANT]: 'مطعم',
  [StoreCategory.CAFE]: 'مقهى',
  [StoreCategory.PET_STORE]: 'مستلزمات الحيوانات',
  [StoreCategory.ELECTRONICS]: 'إلكترونيات',
  [StoreCategory.STATIONERY]: 'قرطاسية',
  [StoreCategory.OTHER]: 'أخرى',
};

const INITIAL_FORM = {
  name: '',
  slug: '',
  billingEmail: '',
  plan: TenantPlan.STARTER,
  storeName: '',
  storeNameAr: '',
  storeCategory: StoreCategory.GROCERY,
  ownerName: '',
  ownerMobile: '',
  ownerPin: '',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));

export default function SuperAdminDashboard() {
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [stats, setStats] = useState<StatsData>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<WizardStep>(1);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TenantStatus>('all');
  const [form, setForm] = useState(INITIAL_FORM);

  const loadData = async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);

    try {
      const [tenantList, statsInfo] = await Promise.all([
        api.get('/tenants/admin/list'),
        api.get('/tenants/admin/stats'),
      ]);
      setTenants((tenantList as TenantItem[]) ?? []);
      setStats((statsInfo as StatsData) ?? EMPTY_STATS);
    } catch {
      toast.error('تعذر تحميل بيانات لوحة الأدمن');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredTenants = useMemo(() => {
    const text = query.trim().toLowerCase();

    return tenants.filter((tenant) => {
      const owner = tenant.staff?.find((member) => member.role === 'owner');
      const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter;
      const matchesQuery =
        !text ||
        tenant.name.toLowerCase().includes(text) ||
        tenant.slug.toLowerCase().includes(text) ||
        tenant.billingEmail?.toLowerCase().includes(text) ||
        owner?.mobile?.toLowerCase().includes(text);

      return matchesStatus && matchesQuery;
    });
  }, [query, statusFilter, tenants]);

  const planChartData = useMemo(
    () =>
      Object.entries(stats.planDistribution).map(([plan, value]) => ({
        name: PLAN_AR_LABELS[plan as TenantPlan] ?? plan,
        value,
        color: PLAN_COLORS[plan as TenantPlan] ?? '#64748B',
      })),
    [stats.planDistribution],
  );

  const statusChartData = useMemo(
    () =>
      Object.entries(stats.statusDistribution).map(([status, value]) => ({
        name: STATUS_LABELS[status as TenantStatus] ?? status,
        value,
        color: STATUS_META[status as TenantStatus]?.color ?? '#64748B',
      })),
    [stats.statusDistribution],
  );

  const activeTenants = stats.statusDistribution[TenantStatus.ACTIVE] ?? 0;
  const trialTenants = stats.statusDistribution[TenantStatus.TRIAL] ?? 0;
  const conversionRate = stats.tenantsCount
    ? Math.round((activeTenants / stats.tenantsCount) * 100)
    : 0;

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setStep(1);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    resetForm();
  };

  const validateStep = (currentStep: WizardStep) => {
    if (currentStep === 1) {
      if (!form.name.trim() || !form.slug.trim() || !form.billingEmail.trim()) {
        toast.error('أكمل اسم المنشأة والرابط والبريد قبل المتابعة');
        return false;
      }
    }

    if (currentStep === 2) {
      if (!form.storeName.trim() || !form.storeNameAr.trim()) {
        toast.error('أدخل اسم الفرع بالعربية والإنجليزية');
        return false;
      }
    }

    if (currentStep === 3) {
      if (!form.ownerName.trim() || !form.ownerMobile.trim() || form.ownerPin.length < 4) {
        toast.error('أدخل بيانات المالك ورمز دخول من 4 أرقام على الأقل');
        return false;
      }
    }

    return true;
  };

  const nextStep = () => {
    if (!validateStep(step)) return;
    setStep((current) => Math.min(3, current + 1) as WizardStep);
  };

  const handleRegister = async () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) return;

    setSaving(true);
    try {
      await api.post('/tenants/register', form);
      toast.success('تم تأسيس المنشأة والفرع وحساب المالك');
      closeModal();
      await loadData(true);
    } catch (err: unknown) {
      const response = err as { response?: { data?: { message?: unknown } }; message?: string };
      const rawMessage = response.response?.data?.message ?? response.message;
      const message = Array.isArray(rawMessage) ? rawMessage.join(', ') : String(rawMessage ?? '');

      toast.error(
        message.includes('Slug already taken')
          ? 'الرابط المختصر مستخدم مسبقا، اختر رابطا آخر'
          : 'فشل تأسيس المنشأة',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTenant = async (
    tenantId: string,
    updates: { plan?: TenantPlan; status?: TenantStatus },
  ) => {
    try {
      await api.patch(`/tenants/${tenantId}/admin-update`, updates);
      setTenants((current) =>
        current.map((tenant) => (tenant.id === tenantId ? { ...tenant, ...updates } : tenant)),
      );
      toast.success('تم تحديث بيانات المنشأة');
      const statsInfo = await api.get('/tenants/admin/stats');
      setStats((statsInfo as StatsData) ?? EMPTY_STATS);
    } catch {
      toast.error('تعذر تحديث بيانات المنشأة');
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black text-foreground">أدمن النظام</h1>
                <Badge variant="default">استلم</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                إدارة المستأجرين، الاشتراكات، وحالة المنصة من مكان واحد.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
              تحديث
            </Button>
            <Button onClick={() => setModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              منشأة جديدة
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {loading ? (
          <LoadingState />
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title="المنشآت"
                value={stats.tenantsCount.toLocaleString('ar-SA')}
                detail={`${activeTenants.toLocaleString('ar-SA')} نشطة`}
                icon={Building2}
                tone="primary"
              />
              <MetricCard
                title="الفروع"
                value={stats.storesCount.toLocaleString('ar-SA')}
                detail="إجمالي الفروع المسجلة"
                icon={Store}
                tone="emerald"
              />
              <MetricCard
                title="الطلبات"
                value={stats.ordersCount.toLocaleString('ar-SA')}
                detail="من جميع المستأجرين"
                icon={BarChart3}
                tone="violet"
              />
              <MetricCard
                title="إيراد الطلبات"
                value={formatCurrency(stats.totalRevenue)}
                detail={`${conversionRate.toLocaleString('ar-SA')}% منشآت نشطة`}
                icon={CreditCard}
                tone="amber"
              />
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle>صحة المنصة</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      توزيع سريع لحالة حسابات المتاجر.
                    </p>
                  </div>
                  <Activity className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-[1fr_220px]">
                  <div className="h-64">
                    {statusChartData.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={statusChartData} margin={{ top: 8, right: 0, left: -24, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                          <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                          <Tooltip cursor={{ fill: '#F1F5F9' }} />
                          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                            {statusChartData.map((item) => (
                              <Cell key={item.name} fill={item.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyChart label="لا توجد بيانات حالات حتى الآن" />
                    )}
                  </div>

                  <div className="grid gap-2 content-center">
                    <StatusPill label="نشط" value={activeTenants} status={TenantStatus.ACTIVE} />
                    <StatusPill label="تجريبي" value={trialTenants} status={TenantStatus.TRIAL} />
                    <StatusPill
                      label="معلق"
                      value={stats.statusDistribution[TenantStatus.SUSPENDED] ?? 0}
                      status={TenantStatus.SUSPENDED}
                    />
                    <StatusPill
                      label="ملغي"
                      value={stats.statusDistribution[TenantStatus.CANCELLED] ?? 0}
                      status={TenantStatus.CANCELLED}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle>الباقات</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">توزيع الاشتراكات الحالية.</p>
                  </div>
                  <Sparkles className="h-5 w-5 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    {planChartData.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={planChartData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92}>
                            {planChartData.map((item) => (
                              <Cell key={item.name} fill={item.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyChart label="لا توجد بيانات باقات حتى الآن" />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {Object.values(TenantPlan).map((plan) => (
                      <div key={plan} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
                        <span className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PLAN_COLORS[plan] }} />
                          {PLAN_AR_LABELS[plan]}
                        </span>
                        <b>{stats.planDistribution[plan] ?? 0}</b>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>

            <Card>
              <CardHeader className="gap-4 border-b">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <CardTitle>إدارة المنشآت</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {filteredTenants.length.toLocaleString('ar-SA')} نتيجة معروضة من أصل{' '}
                      {tenants.length.toLocaleString('ar-SA')}.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="بحث بالاسم، الرابط، البريد، الجوال"
                        className="h-10 w-full pr-9 sm:w-80"
                      />
                    </div>
                    <select
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value as 'all' | TenantStatus)}
                      className="h-10 rounded-xl border border-input bg-white px-3 text-sm outline-none focus:border-primary"
                    >
                      <option value="all">كل الحالات</option>
                      {Object.values(TenantStatus).map((status) => (
                        <option key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-right text-sm">
                    <thead className="border-b bg-muted/60 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-5 py-3 font-bold">المنشأة</th>
                        <th className="px-5 py-3 font-bold">الباقة</th>
                        <th className="px-5 py-3 font-bold">الحالة</th>
                        <th className="px-5 py-3 font-bold">الفروع</th>
                        <th className="px-5 py-3 font-bold">المالك</th>
                        <th className="px-5 py-3 font-bold">تاريخ التسجيل</th>
                        <th className="px-5 py-3 text-center font-bold">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredTenants.map((tenant) => {
                        const owner = tenant.staff?.find((member) => member.role === 'owner');

                        return (
                          <tr key={tenant.id} className="bg-white transition-colors hover:bg-muted/40">
                            <td className="px-5 py-4">
                              <div className="font-bold text-foreground">{tenant.name}</div>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <span dir="ltr">/{tenant.slug}</span>
                                {tenant.billingEmail && (
                                  <span className="inline-flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {tenant.billingEmail}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <select
                                value={tenant.plan}
                                onChange={(event) =>
                                  handleUpdateTenant(tenant.id, { plan: event.target.value as TenantPlan })
                                }
                                className="h-9 rounded-lg border border-input bg-white px-2 text-xs outline-none focus:border-primary"
                              >
                                {Object.values(TenantPlan).map((plan) => (
                                  <option key={plan} value={plan}>
                                    {PLAN_AR_LABELS[plan]} ({PLAN_LABELS[plan]})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-5 py-4">
                              <Badge variant={STATUS_META[tenant.status].badge}>
                                {STATUS_LABELS[tenant.status]}
                              </Badge>
                            </td>
                            <td className="px-5 py-4">
                              <div className="inline-flex items-center gap-2 rounded-lg bg-muted px-2.5 py-1 font-bold">
                                <Store className="h-4 w-4 text-primary" />
                                {(tenant.stores?.length ?? 0).toLocaleString('ar-SA')}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="font-medium">{owner?.name ?? 'غير محدد'}</div>
                              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground" dir="ltr">
                                <Phone className="h-3 w-3" />
                                {owner?.mobile ?? '-'}
                              </div>
                            </td>
                            <td className="px-5 py-4 text-muted-foreground">{formatDate(tenant.createdAt)}</td>
                            <td className="px-5 py-4">
                              <div className="flex justify-center gap-2">
                                {tenant.status === TenantStatus.SUSPENDED ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handleUpdateTenant(tenant.id, { status: TenantStatus.ACTIVE })
                                    }
                                    className="text-emerald-700"
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                    تفعيل
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handleUpdateTenant(tenant.id, { status: TenantStatus.SUSPENDED })
                                    }
                                    className="text-amber-700"
                                  >
                                    <PauseCircle className="h-4 w-4" />
                                    تعليق
                                  </Button>
                                )}
                                <Button size="icon" variant="ghost" aria-label="المزيد">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {!filteredTenants.length && (
                        <tr>
                          <td colSpan={7} className="px-5 py-16">
                            <div className="mx-auto max-w-sm text-center">
                              <AlertTriangle className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
                              <h3 className="font-bold">لا توجد نتائج</h3>
                              <p className="mt-1 text-sm text-muted-foreground">
                                جرّب تغيير البحث أو الفلتر الحالي.
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <Card className="max-h-[92vh] w-full max-w-2xl overflow-hidden">
            <div className="flex items-start justify-between border-b p-5">
              <div>
                <h2 className="text-xl font-black">تأسيس منشأة جديدة</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  أنشئ حساب المستأجر، أول فرع، وحساب المالك في تدفق واحد.
                </p>
              </div>
              <button
                onClick={closeModal}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b bg-muted/50 px-5 py-4">
              <div className="grid grid-cols-3 gap-2">
                <StepMarker number={1} active={step === 1} done={step > 1} label="المنشأة" />
                <StepMarker number={2} active={step === 2} done={step > 2} label="الفرع" />
                <StepMarker number={3} active={step === 3} done={false} label="المالك" />
              </div>
            </div>

            <CardContent className="max-h-[56vh] overflow-y-auto p-5">
              {step === 1 && (
                <div className="grid gap-4">
                  <Field label="اسم المنشأة" icon={Building2}>
                    <Input
                      value={form.name}
                      onChange={(event) => setForm({ ...form, name: event.target.value })}
                      placeholder="مثال: أسواق الرياض"
                    />
                  </Field>
                  <Field label="الرابط المختصر" hint="أحرف إنجليزية وأرقام وشرطات فقط.">
                    <Input
                      value={form.slug}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          slug: event.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, '')
                            .replace(/--+/g, '-'),
                        })
                      }
                      placeholder="riyadh-market"
                      dir="ltr"
                    />
                  </Field>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="بريد الفواتير" icon={Mail}>
                      <Input
                        type="email"
                        value={form.billingEmail}
                        onChange={(event) => setForm({ ...form, billingEmail: event.target.value.trim() })}
                        placeholder="billing@company.com"
                        dir="ltr"
                      />
                    </Field>
                    <Field label="الباقة">
                      <Select
                        value={form.plan}
                        onChange={(value) => setForm({ ...form, plan: value as TenantPlan })}
                        options={Object.values(TenantPlan).map((plan) => ({
                          value: plan,
                          label: `${PLAN_AR_LABELS[plan]} (${PLAN_LABELS[plan]})`,
                        }))}
                      />
                    </Field>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="grid gap-4">
                  <Field label="اسم الفرع بالعربية">
                    <Input
                      value={form.storeNameAr}
                      onChange={(event) => setForm({ ...form, storeNameAr: event.target.value })}
                      placeholder="أسواق الرياض - فرع الياسمين"
                    />
                  </Field>
                  <Field label="اسم الفرع بالإنجليزية">
                    <Input
                      value={form.storeName}
                      onChange={(event) => setForm({ ...form, storeName: event.target.value })}
                      placeholder="Riyadh Market - Al Yasmin"
                      dir="ltr"
                    />
                  </Field>
                  <Field label="تصنيف النشاط">
                    <Select
                      value={form.storeCategory}
                      onChange={(value) => setForm({ ...form, storeCategory: value as StoreCategory })}
                      options={Object.values(StoreCategory).map((category) => ({
                        value: category,
                        label: CATEGORY_LABELS[category],
                      }))}
                    />
                  </Field>
                </div>
              )}

              {step === 3 && (
                <div className="grid gap-4">
                  <Field label="اسم المالك" icon={User}>
                    <Input
                      value={form.ownerName}
                      onChange={(event) => setForm({ ...form, ownerName: event.target.value })}
                      placeholder="اسم المسؤول الرئيسي"
                    />
                  </Field>
                  <Field label="جوال المالك" icon={Phone} hint="يستخدم لتسجيل الدخول في لوحة المتجر.">
                    <Input
                      type="tel"
                      value={form.ownerMobile}
                      onChange={(event) => setForm({ ...form, ownerMobile: event.target.value.trim() })}
                      placeholder="+9665xxxxxxxx"
                      dir="ltr"
                    />
                  </Field>
                  <Field label="رمز الدخول PIN">
                    <Input
                      type="password"
                      value={form.ownerPin}
                      onChange={(event) =>
                        setForm({ ...form, ownerPin: event.target.value.replace(/\D/g, '').slice(0, 6) })
                      }
                      placeholder="4 إلى 6 أرقام"
                      className="text-center text-lg font-bold tracking-[0.35em]"
                    />
                  </Field>
                </div>
              )}
            </CardContent>

            <div className="flex gap-3 border-t bg-muted/40 p-4">
              {step > 1 && (
                <Button
                  variant="outline"
                  onClick={() => setStep((current) => Math.max(1, current - 1) as WizardStep)}
                  className="flex-1"
                >
                  السابق
                </Button>
              )}
              {step < 3 ? (
                <Button onClick={nextStep} className="flex-1">
                  التالي
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleRegister} disabled={saving} className="flex-1">
                  {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  تأسيس المنشأة
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="h-32 animate-pulse bg-muted/60" />
        ))}
      </div>
      <Card className="h-96 animate-pulse bg-muted/60" />
    </div>
  );
}

function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  detail: string;
  icon: typeof Building2;
  tone: 'primary' | 'emerald' | 'violet' | 'amber';
}) {
  const toneClass = {
    primary: 'bg-primary/10 text-primary',
    emerald: 'bg-emerald-100 text-emerald-700',
    violet: 'bg-violet-100 text-violet-700',
    amber: 'bg-amber-100 text-amber-700',
  }[tone];

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-black text-foreground">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', toneClass)}>
          <Icon className="h-6 w-6" />
        </div>
      </CardContent>
    </Card>
  );
}

function StatusPill({ label, value, status }: { label: string; value: number; status: TenantStatus }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-white px-3 py-2">
      <span className="flex items-center gap-2 text-sm">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_META[status].color }} />
        {label}
      </span>
      <b>{value.toLocaleString('ar-SA')}</b>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function StepMarker({
  number,
  label,
  active,
  done,
}: {
  number: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold',
        active && 'bg-primary text-white',
        done && 'bg-emerald-100 text-emerald-700',
        !active && !done && 'bg-white text-muted-foreground',
      )}
    >
      {done ? <CheckCircle2 className="h-4 w-4" /> : <span>{number}</span>}
      {label}
    </div>
  );
}

function Field({
  label,
  hint,
  icon: Icon,
  children,
}: {
  label: string;
  hint?: string;
  icon?: typeof Building2;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="flex items-center gap-2 text-sm font-bold">
        {Icon && <Icon className="h-4 w-4 text-primary" />}
        {label}
      </span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 rounded-xl border border-input bg-white px-3 text-sm outline-none transition-colors focus:border-primary"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
