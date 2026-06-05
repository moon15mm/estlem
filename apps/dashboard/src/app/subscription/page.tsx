'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  CheckCircle2, Clock3, AlertTriangle, X as XIcon, CreditCard, Loader2,
  Calendar, Crown, Car, UtensilsCrossed,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import {
  ServicePlan, SERVICE_PLAN_META, SERVICE_PLAN_PRICE, SubscriptionStatus,
  GRACE_PERIOD_DAYS, DINE_IN_CATEGORIES, StoreCategory,
} from '@estlem/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SubResp {
  subscription: {
    id: string;
    plan: ServicePlan;
    status: SubscriptionStatus;
    startedAt: string;
    expiresAt: string;
    graceEndsAt: string | null;
    monthlyPrice: number | string;
    autoRenew: boolean;
    lastPaymentAt: string | null;
    lastPaymentAmount: number | string | null;
  } | null;
}

const STATUS_LABEL: Record<string, string> = {
  active: 'نشط',
  grace: 'في فترة السماح',
  expired: 'منتهي',
  cancelled: 'ملغي',
  trial: 'تجريبي',
};
const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'muted' | 'default'> = {
  active: 'success',
  grace: 'warning',
  expired: 'destructive',
  cancelled: 'muted',
  trial: 'default',
};
const formatSAR = (v: number | string) =>
  new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 })
    .format(Number(v || 0));
const formatDate = (v: string | null) =>
  v ? new Intl.DateTimeFormat('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(v)) : '—';
const daysBetween = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

export default function SubscriptionPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [sub, setSub] = useState<SubResp['subscription']>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<ServicePlan>(ServicePlan.PARKING);
  const [months, setMonths] = useState(1);
  const [subscribing, setSubscribing] = useState(false);
  const [hasDineIn, setHasDineIn] = useState(false);

  const availablePlans = hasDineIn
    ? [ServicePlan.PARKING, ServicePlan.DINE_IN, ServicePlan.FULL]
    : [ServicePlan.PARKING];

  useEffect(() => {
    if (!useAuth.getState().token) { router.replace('/login'); return; }
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [r, storesData] = await Promise.all([
        api.get('/service-subscriptions/me'),
        api.get('/stores').catch(() => []),
      ]);
      const resp = r as unknown as SubResp;
      setSub(resp?.subscription ?? null);

      // Detect whether this tenant has any dine-in capable store
      const stores: Array<{ category?: string }> = (storesData as any[]) ?? [];
      const dineIn = stores.some(
        (s) => s.category && DINE_IN_CATEGORIES.includes(s.category as StoreCategory),
      );
      setHasDineIn(dineIn);

      // Pick a sensible default plan
      if (resp?.subscription?.plan) {
        setSelectedPlan(resp.subscription.plan);
      } else {
        setSelectedPlan(dineIn ? ServicePlan.FULL : ServicePlan.PARKING);
      }
    } catch {
      setSub(null);
    } finally {
      setLoading(false);
    }
  };

  // Make sure the currently selected plan is still allowed after stores load
  useEffect(() => {
    if (!availablePlans.includes(selectedPlan)) {
      setSelectedPlan(availablePlans[0]);
    }
  }, [hasDineIn]); // eslint-disable-line react-hooks/exhaustive-deps

  const subscribe = async () => {
    setSubscribing(true);
    try {
      await api.post('/service-subscriptions/me/subscribe', { plan: selectedPlan, months });
      toast.success('تم تفعيل الاشتراك');
      await load();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      if (typeof msg === 'string' && msg.includes('Dine-in')) {
        toast.error('الباقة تتطلب وجود مطعم / كافيه / بوفيه — أنشئ متجراً من النوع المناسب');
      } else {
        toast.error(msg ?? 'فشل تفعيل الاشتراك');
      }
    } finally {
      setSubscribing(false);
    }
  };

  const cancel = async () => {
    if (!confirm('هل أنت متأكد من إلغاء الاشتراك؟ ستفقد ميزات الباقة في نهاية الفترة الحالية.')) return;
    try {
      await api.post('/service-subscriptions/me/cancel');
      toast.success('تم إلغاء التجديد التلقائي');
      await load();
    } catch {
      toast.error('فشل الإلغاء');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen" dir="rtl">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  const days = sub ? daysBetween(sub.expiresAt) : 0;
  const isActive = sub?.status === SubscriptionStatus.ACTIVE;
  const isGrace = sub?.status === SubscriptionStatus.GRACE;
  const isExpired = sub?.status === SubscriptionStatus.EXPIRED || sub?.status === SubscriptionStatus.CANCELLED;

  return (
    <div className="flex min-h-screen bg-background" dir="rtl">
      <Sidebar />
      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-foreground">الاشتراك</h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة باقة الاشتراك والتجديد والمدفوعات.</p>
        </div>

        {/* Current subscription card */}
        {sub ? (
          <Card className="mb-6 overflow-hidden border-0 shadow-lg">
            <div className={cn(
              'p-5 text-white',
              isActive ? 'bg-gradient-to-bl from-emerald-600 to-emerald-700'
                : isGrace ? 'bg-gradient-to-bl from-amber-500 to-amber-600'
                : 'bg-gradient-to-bl from-red-500 to-red-600',
            )}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Crown className="h-4 w-4" />
                    <Badge className="bg-white/20 text-white border-0">{STATUS_LABEL[sub.status]}</Badge>
                  </div>
                  <h2 className="text-2xl font-black">{SERVICE_PLAN_META[sub.plan].nameAr}</h2>
                  <p className="text-white/80 text-sm mt-1">{formatSAR(sub.monthlyPrice)} شهرياً</p>
                </div>
                <div className="text-left">
                  {isActive && (
                    <>
                      <p className="text-white/70 text-xs">ينتهي خلال</p>
                      <p className="font-black text-2xl mt-1">{days.toLocaleString('ar-SA')}</p>
                      <p className="text-white/70 text-xs">يوم</p>
                    </>
                  )}
                  {isGrace && sub.graceEndsAt && (
                    <>
                      <p className="text-white/70 text-xs">المهلة تنتهي</p>
                      <p className="font-black text-lg mt-1">{formatDate(sub.graceEndsAt)}</p>
                    </>
                  )}
                  {isExpired && (
                    <>
                      <p className="text-white/70 text-xs">انتهى في</p>
                      <p className="font-black text-lg mt-1">{formatDate(sub.expiresAt)}</p>
                    </>
                  )}
                </div>
              </div>
            </div>
            <CardContent className="grid gap-4 sm:grid-cols-3 p-5">
              <div>
                <p className="text-xs text-muted-foreground">بدأ الاشتراك</p>
                <p className="font-bold mt-1 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-primary" />{formatDate(sub.startedAt)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ينتهي</p>
                <p className="font-bold mt-1 flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5 text-primary" />{formatDate(sub.expiresAt)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">آخر دفعة</p>
                <p className="font-bold mt-1 flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-primary" />
                  {sub.lastPaymentAt ? `${formatSAR(sub.lastPaymentAmount ?? 0)} • ${formatDate(sub.lastPaymentAt)}` : 'لم يحدث بعد'}
                </p>
              </div>
            </CardContent>
            {(isActive || isGrace) && sub.autoRenew && (
              <div className="border-t bg-muted/30 px-5 py-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">التجديد التلقائي مُفعّل</span>
                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={cancel}>
                  <XIcon className="h-3.5 w-3.5 ml-1" /> إيقاف التجديد
                </Button>
              </div>
            )}
          </Card>
        ) : (
          <Card className="mb-6 border-dashed">
            <CardContent className="p-8 text-center">
              <Crown className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-bold text-lg mb-1">لا يوجد اشتراك حالياً</h3>
              <p className="text-sm text-muted-foreground">اختر باقة لبدء استقبال الطلبات.</p>
            </CardContent>
          </Card>
        )}

        {/* Plan picker */}
        <Card>
          <CardHeader>
            <CardTitle>{sub ? 'تغيير أو تجديد الباقة' : 'اختر باقة'}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              التجديد يبدأ من تاريخ انتهاء اشتراكك الحالي. الباقة الشاملة توفّر 0 ريال مقابل الباقتين معاً.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            {!hasDineIn && (
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">باقات الطاولة غير متاحة لمتجرك</p>
                  <p className="mt-1">باقات "الطاولة" و"الشاملة" تتطلب أن يكون متجرك من نوع مطعم / كافيه / بوفيه.
                  إذا غيّرت تصنيف المتجر من الإعدادات ستظهر تلقائياً.</p>
                </div>
              </div>
            )}
            <div className={cn('grid gap-3', availablePlans.length === 1 ? 'sm:grid-cols-1 max-w-md mx-auto' : 'sm:grid-cols-3')}>
              {availablePlans.map((p) => {
                const meta = SERVICE_PLAN_META[p];
                const price = SERVICE_PLAN_PRICE[p];
                const isSelected = selectedPlan === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSelectedPlan(p)}
                    className={cn(
                      'rounded-2xl border-2 p-5 text-right transition relative',
                      isSelected ? 'border-primary bg-primary/5 ring-4 ring-primary/10' : 'border-border hover:border-primary/40',
                    )}
                  >
                    {p === ServicePlan.FULL && (
                      <span className="absolute -top-2 right-4 bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                        الأوفر
                      </span>
                    )}
                    <div className="flex items-center gap-2 mb-3">
                      {meta.includes.includes('drive_through') && <Car className="h-4 w-4 text-primary" />}
                      {meta.includes.includes('dine_in') && <UtensilsCrossed className="h-4 w-4 text-emerald-600" />}
                    </div>
                    <h3 className="font-black text-base mb-1">{meta.nameAr}</h3>
                    <div className="flex items-baseline gap-1 mb-3">
                      <span className="text-2xl font-black text-primary">{price}</span>
                      <span className="text-xs text-muted-foreground">ر.س / شهر</span>
                    </div>
                    <ul className="space-y-1.5 text-xs">
                      {meta.includes.includes('drive_through') && (
                        <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> الطلب من السيارة + QR للمواقف</li>
                      )}
                      {meta.includes.includes('dine_in') && (
                        <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> الطلب من الطاولة + QR للطاولات</li>
                      )}
                    </ul>
                  </button>
                );
              })}
            </div>

            <div>
              <label className="text-xs font-bold mb-2 block">عدد الأشهر</label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 3, 6, 12].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMonths(m)}
                    className={cn(
                      'h-12 rounded-xl border-2 text-sm font-bold transition relative',
                      months === m ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/40',
                    )}
                  >
                    {m} {m === 1 ? 'شهر' : 'أشهر'}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-muted/40 p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">المبلغ الإجمالي</p>
                <p className="font-black text-2xl text-primary mt-1">
                  {(SERVICE_PLAN_PRICE[selectedPlan] * months).toLocaleString('ar-SA')} ر.س
                </p>
              </div>
              <Button onClick={subscribe} disabled={subscribing} size="lg" className="gap-2">
                {subscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {sub ? 'تجديد / تغيير' : 'تفعيل'}
              </Button>
            </div>

            {isGrace && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">أنت في فترة السماح ({GRACE_PERIOD_DAYS} أيام)</p>
                  <p className="text-xs mt-1">جدّد قبل انتهاء المهلة لتجنب توقف الخدمة.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
