import { DataSource } from 'typeorm';
import { TenantPlan } from '@estlem/shared';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';
import { CommissionRule } from '../entities/commission-rule.entity';
import { CommissionType } from '@estlem/shared';

export async function seedPlans(dataSource: DataSource) {
  const repo = dataSource.getRepository(SubscriptionPlan);
  const existing = await repo.count();
  if (existing > 0) {
    console.log('Plans already seeded. Skipping.');
    return;
  }

  const plans: Partial<SubscriptionPlan>[] = [
    {
      name: 'Starter', nameAr: 'المبتدئ', tier: TenantPlan.STARTER,
      description: 'Perfect for small businesses', descriptionAr: 'مثالي للأعمال الصغيرة',
      monthlyPrice: 99, yearlyPrice: 990,
      maxOrdersPerMonth: 500, maxEmployees: 3, maxBranches: 1, maxProducts: 100,
      hasAnalytics: false, hasLoyalty: false, hasApiAccess: false, hasCustomBranding: false,
      hasPrioritySupport: false, hasExport: false, trialDays: 14, sortOrder: 1,
      features: [
        { name: 'Order Management', nameAr: 'إدارة الطلبات', included: true },
        { name: 'QR Ordering', nameAr: 'طلب عبر QR', included: true },
        { name: 'Basic Reports', nameAr: 'تقارير أساسية', included: true },
        { name: 'Analytics', nameAr: 'تحليلات متقدمة', included: false },
        { name: 'Loyalty Program', nameAr: 'برنامج الولاء', included: false },
      ],
    },
    {
      name: 'Growth', nameAr: 'النمو', tier: TenantPlan.GROWTH,
      description: 'For growing businesses', descriptionAr: 'للأعمال النامية',
      monthlyPrice: 249, yearlyPrice: 2490,
      maxOrdersPerMonth: 2000, maxEmployees: 10, maxBranches: 3, maxProducts: 500,
      hasAnalytics: true, hasLoyalty: false, hasApiAccess: false, hasCustomBranding: true,
      hasPrioritySupport: false, hasExport: true, trialDays: 14, sortOrder: 2,
      features: [
        { name: 'Everything in Starter', nameAr: 'كل ميزات المبتدئ', included: true },
        { name: 'Advanced Analytics', nameAr: 'تحليلات متقدمة', included: true },
        { name: 'Export Reports', nameAr: 'تصدير التقارير', included: true },
        { name: 'Custom Branding', nameAr: 'هوية مخصصة', included: true },
        { name: 'Loyalty Program', nameAr: 'برنامج الولاء', included: false },
      ],
    },
    {
      name: 'Business', nameAr: 'الأعمال', tier: TenantPlan.BUSINESS,
      description: 'Complete solution for established businesses', descriptionAr: 'حل متكامل للأعمال المؤسسة',
      monthlyPrice: 499, yearlyPrice: 4990,
      maxOrdersPerMonth: 10000, maxEmployees: 30, maxBranches: 10, maxProducts: 2000,
      hasAnalytics: true, hasLoyalty: true, hasApiAccess: true, hasCustomBranding: true,
      hasPrioritySupport: true, hasExport: true, trialDays: 14, sortOrder: 3,
      features: [
        { name: 'Everything in Growth', nameAr: 'كل ميزات النمو', included: true },
        { name: 'Loyalty Program', nameAr: 'برنامج الولاء', included: true },
        { name: 'API Access', nameAr: 'وصول API', included: true },
        { name: 'Priority Support', nameAr: 'دعم أولوي', included: true },
        { name: 'Multi-Branch', nameAr: 'فروع متعددة', included: true },
      ],
    },
    {
      name: 'Enterprise', nameAr: 'المؤسسات', tier: TenantPlan.ENTERPRISE,
      description: 'Enterprise-grade with unlimited everything', descriptionAr: 'حل مؤسسي بلا حدود',
      monthlyPrice: 999, yearlyPrice: 9990,
      maxOrdersPerMonth: 999999, maxEmployees: 999, maxBranches: 100, maxProducts: 99999,
      hasAnalytics: true, hasLoyalty: true, hasApiAccess: true, hasCustomBranding: true,
      hasPrioritySupport: true, hasExport: true, trialDays: 30, sortOrder: 4,
      features: [
        { name: 'Everything in Business', nameAr: 'كل ميزات الأعمال', included: true },
        { name: 'Unlimited Orders', nameAr: 'طلبات بلا حدود', included: true },
        { name: 'Dedicated Support', nameAr: 'دعم مخصص', included: true },
        { name: 'Custom Integrations', nameAr: 'تكاملات مخصصة', included: true },
        { name: 'SLA Guarantee', nameAr: 'ضمان مستوى الخدمة', included: true },
      ],
    },
  ];

  await repo.save(plans.map(p => repo.create(p)));
  console.log('✅ Subscription plans seeded');
}

export async function seedGlobalCommission(dataSource: DataSource) {
  const repo = dataSource.getRepository(CommissionRule);
  const existing = await repo.count({ where: { isGlobal: true } });
  if (existing > 0) {
    console.log('Global commission rule already exists. Skipping.');
    return;
  }

  await repo.save(repo.create({
    isGlobal: true,
    type: CommissionType.PERCENTAGE,
    value: 5,
    isActive: true,
    description: 'Default 5% platform commission on all orders',
  }));
  console.log('✅ Global commission rule seeded: 5%');
}
