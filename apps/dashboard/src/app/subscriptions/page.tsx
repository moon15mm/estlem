'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Plan {
  id: string;
  name: string;
  nameAr: string;
  tier: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxOrdersPerMonth: number;
  maxEmployees: number;
  maxBranches: number;
  maxProducts: number;
  hasAnalytics: boolean;
  hasLoyalty: boolean;
  hasExport: boolean;
  features: { name: string; nameAr: string; included: boolean }[];
}

interface Subscription {
  id: string;
  status: string;
  billingCycle: string;
  currentPeriodEnd: string;
  plan: Plan;
}

export default function SubscriptionsPage() {
  const { token } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api.get('/subscriptions/plans').then(r => setPlans(r.data)),
      api.get('/subscriptions/my').then(r => setSubscription(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [token]);

  const handleSubscribe = async (planTier: string) => {
    try {
      const res = await api.post('/subscriptions/subscribe', { planTier, billingCycle });
      setSubscription(res.data);
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold">الاشتراكات</h1>
        <p className="text-gray-500">اختر الباقة المناسبة لعملك</p>
      </div>

      {subscription && (
        <Card className="p-6 border-emerald-500 border-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">اشتراكك الحالي</h3>
              <p className="text-gray-600">باقة {subscription.plan?.nameAr || subscription.plan?.name}</p>
              <p className="text-sm text-gray-400">
                ينتهي في {new Date(subscription.currentPeriodEnd).toLocaleDateString('ar-SA')}
              </p>
            </div>
            <Badge className={subscription.status === 'active' ? 'bg-emerald-500' : subscription.status === 'trial' ? 'bg-blue-500' : 'bg-red-500'}>
              {subscription.status === 'active' ? 'فعال' : subscription.status === 'trial' ? 'تجريبي' : subscription.status}
            </Badge>
          </div>
        </Card>
      )}

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setBillingCycle('monthly')}
          className={`px-4 py-2 rounded-lg font-medium ${billingCycle === 'monthly' ? 'bg-emerald-500 text-white' : 'bg-gray-100'}`}
        >
          شهري
        </button>
        <button
          onClick={() => setBillingCycle('yearly')}
          className={`px-4 py-2 rounded-lg font-medium ${billingCycle === 'yearly' ? 'bg-emerald-500 text-white' : 'bg-gray-100'}`}
        >
          سنوي (وفّر 17%)
        </button>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
          const isCurrentPlan = subscription?.plan?.tier === plan.tier;

          return (
            <Card key={plan.id} className={`p-6 ${isCurrentPlan ? 'ring-2 ring-emerald-500' : ''}`}>
              <div className="text-center mb-4">
                <h3 className="text-xl font-bold">{plan.nameAr}</h3>
                <p className="text-gray-500 text-sm">{plan.name}</p>
              </div>

              <div className="text-center mb-6">
                <span className="text-4xl font-bold text-emerald-600">{price}</span>
                <span className="text-gray-500 mr-1">ر.س/{billingCycle === 'monthly' ? 'شهر' : 'سنة'}</span>
              </div>

              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2 text-sm">
                  <span className="text-emerald-500">✓</span>
                  {plan.maxOrdersPerMonth >= 999999 ? 'طلبات بلا حدود' : `${plan.maxOrdersPerMonth} طلب/شهر`}
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <span className="text-emerald-500">✓</span>
                  {plan.maxEmployees >= 999 ? 'موظفين بلا حدود' : `${plan.maxEmployees} موظفين`}
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <span className="text-emerald-500">✓</span>
                  {plan.maxBranches >= 100 ? 'فروع بلا حدود' : `${plan.maxBranches} فروع`}
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <span className="text-emerald-500">✓</span>
                  {plan.maxProducts >= 99999 ? 'منتجات بلا حدود' : `${plan.maxProducts} منتج`}
                </li>
                {plan.features?.map((f, i) => (
                  <li key={i} className={`flex items-center gap-2 text-sm ${!f.included ? 'text-gray-300' : ''}`}>
                    <span className={f.included ? 'text-emerald-500' : 'text-gray-300'}>{f.included ? '✓' : '✗'}</span>
                    {f.nameAr}
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleSubscribe(plan.tier)}
                disabled={isCurrentPlan}
                className="w-full bg-emerald-500 hover:bg-emerald-600"
              >
                {isCurrentPlan ? 'باقتك الحالية' : 'اشترك الآن'}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
