'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, CreditCard } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { SERVICE_PLAN_META, SubscriptionStatus, RENEWAL_WARNING_DAYS } from '@estlem/shared';
import { cn } from '@/lib/utils';

interface SubResp {
  subscription: {
    id: string;
    plan: 'parking' | 'dine_in' | 'full';
    status: SubscriptionStatus;
    expiresAt: string;
    graceEndsAt: string | null;
    monthlyPrice: number | string;
  } | null;
}

const PLAN_LABEL: Record<string, string> = {
  parking: SERVICE_PLAN_META.parking.nameAr,
  dine_in: SERVICE_PLAN_META.dine_in.nameAr,
  full: SERVICE_PLAN_META.full.nameAr,
};

const daysBetween = (iso: string) =>
  Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

export function SubscriptionBanner() {
  const { token } = useAuth();
  const [sub, setSub] = useState<SubResp['subscription']>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.get('/service-subscriptions/me')
      .then((r: any) => setSub(r?.subscription ?? null))
      .catch(() => { /* silently ignore — banner is optional */ })
      .finally(() => setLoaded(true));
  }, [token]);

  if (!loaded || !sub) return null;

  const days = daysBetween(sub.expiresAt);
  const isActive = sub.status === SubscriptionStatus.ACTIVE;
  const isGrace = sub.status === SubscriptionStatus.GRACE;
  const isExpired = sub.status === SubscriptionStatus.EXPIRED || sub.status === SubscriptionStatus.CANCELLED;
  const warning = isActive && days <= RENEWAL_WARNING_DAYS;

  // Active + plenty of time left → mini info pill
  if (isActive && !warning) {
    return (
      <div className="mb-4 mx-1 rounded-xl bg-white/10 px-3 py-2 text-xs text-white/80">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-bold">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
            {PLAN_LABEL[sub.plan]}
          </span>
          <span className="text-white/60">{days.toLocaleString('ar-SA')} يوم</span>
        </div>
      </div>
    );
  }

  // Otherwise → full alert banner
  const tone = isExpired
    ? 'bg-red-500/15 border-red-400/40 text-red-100'
    : isGrace
    ? 'bg-amber-500/15 border-amber-400/40 text-amber-100'
    : 'bg-amber-500/15 border-amber-400/40 text-amber-100'; // warning

  const Icon = isExpired ? AlertTriangle : isGrace ? Clock3 : AlertTriangle;
  const title = isExpired
    ? 'انتهى اشتراكك'
    : isGrace
    ? 'انتهت الباقة — في فترة السماح'
    : `تجديد خلال ${days.toLocaleString('ar-SA')} يوم`;

  const subtitle = isExpired
    ? 'يرجى التجديد لاستئناف استقبال الطلبات.'
    : isGrace && sub.graceEndsAt
    ? `تنتهي المهلة في ${new Date(sub.graceEndsAt).toLocaleDateString('ar-SA')}`
    : `الباقة الحالية: ${PLAN_LABEL[sub.plan]}`;

  return (
    <div className={cn('mb-4 mx-1 rounded-xl border px-3 py-2.5', tone)}>
      <div className="flex items-start gap-2">
        <Icon className="h-4 w-4 mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold leading-tight">{title}</p>
          <p className="mt-1 text-[10px] leading-relaxed opacity-90">{subtitle}</p>
          <a
            href="/subscription"
            className="mt-2 inline-flex items-center gap-1 rounded-lg bg-white/20 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-white/30"
          >
            <CreditCard className="h-3 w-3" />
            {isExpired || isGrace ? 'جدّد الآن' : 'الاشتراك'}
          </a>
        </div>
      </div>
    </div>
  );
}
