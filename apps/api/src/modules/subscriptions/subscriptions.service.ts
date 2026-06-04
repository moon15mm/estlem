import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from '../../database/entities/subscription.entity';
import { SubscriptionPlan } from '../../database/entities/subscription-plan.entity';
import { Invoice } from '../../database/entities/invoice.entity';
import { Tenant } from '../../database/entities/tenant.entity';
import { SubscriptionStatus, BillingCycle, TenantPlan, TenantStatus, InvoiceStatus } from '@estlem/shared';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private subRepo: Repository<Subscription>,
    @InjectRepository(SubscriptionPlan)
    private planRepo: Repository<SubscriptionPlan>,
    @InjectRepository(Invoice)
    private invoiceRepo: Repository<Invoice>,
    @InjectRepository(Tenant)
    private tenantRepo: Repository<Tenant>,
  ) {}

  async getPlans() {
    return this.planRepo.find({ where: { isActive: true }, order: { sortOrder: 'ASC' } });
  }

  async getMySubscription(tenantId: string) {
    const sub = await this.subRepo.findOne({
      where: { tenantId },
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });
    if (!sub) throw new NotFoundException('No subscription found');
    return sub;
  }

  async subscribe(tenantId: string, planTier: TenantPlan, billingCycle: BillingCycle) {
    const plan = await this.planRepo.findOne({ where: { tier: planTier, isActive: true } });
    if (!plan) throw new NotFoundException('Plan not found');

    const existing = await this.subRepo.findOne({ where: { tenantId, status: SubscriptionStatus.ACTIVE } });
    if (existing) throw new BadRequestException('Already have an active subscription. Use upgrade instead.');

    const now = new Date();
    const periodEnd = new Date(now);
    if (billingCycle === BillingCycle.MONTHLY) {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    const price = billingCycle === BillingCycle.MONTHLY ? plan.monthlyPrice : plan.yearlyPrice;

    const sub = this.subRepo.create({
      tenantId,
      planId: plan.id,
      status: SubscriptionStatus.ACTIVE,
      billingCycle,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      monthlyPrice: plan.monthlyPrice,
      yearlyPrice: plan.yearlyPrice,
    });
    await this.subRepo.save(sub);

    // Update tenant plan
    await this.tenantRepo.update(tenantId, { plan: planTier, status: TenantStatus.ACTIVE });

    // Generate invoice
    await this.generateInvoice(tenantId, sub.id, price, now, periodEnd);

    return sub;
  }

  async upgrade(tenantId: string, newTier: TenantPlan) {
    const currentSub = await this.subRepo.findOne({
      where: { tenantId },
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });
    if (!currentSub) throw new NotFoundException('No subscription found');

    const newPlan = await this.planRepo.findOne({ where: { tier: newTier, isActive: true } });
    if (!newPlan) throw new NotFoundException('Plan not found');

    const tierOrder = { [TenantPlan.STARTER]: 1, [TenantPlan.GROWTH]: 2, [TenantPlan.BUSINESS]: 3, [TenantPlan.ENTERPRISE]: 4 };
    if (tierOrder[newTier] <= tierOrder[currentSub.plan.tier]) {
      throw new BadRequestException('Can only upgrade to a higher plan');
    }

    currentSub.planId = newPlan.id;
    currentSub.monthlyPrice = newPlan.monthlyPrice;
    currentSub.yearlyPrice = newPlan.yearlyPrice;
    await this.subRepo.save(currentSub);

    await this.tenantRepo.update(tenantId, { plan: newTier });

    return currentSub;
  }

  async cancel(tenantId: string) {
    const sub = await this.subRepo.findOne({ where: { tenantId, status: SubscriptionStatus.ACTIVE } });
    if (!sub) throw new NotFoundException('No active subscription');

    sub.status = SubscriptionStatus.CANCELLED;
    sub.cancelledAt = new Date();
    sub.autoRenew = false;
    await this.subRepo.save(sub);

    return sub;
  }

  async getInvoices(tenantId: string, page = 1, limit = 20) {
    const [invoices, total] = await this.invoiceRepo.findAndCount({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { invoices, total, page, limit };
  }

  private async generateInvoice(tenantId: string, subscriptionId: string, amount: number, start: Date, end: Date) {
    const count = await this.invoiceRepo.count({ where: { tenantId } });
    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}-${(count + 1).toString().padStart(4, '0')}`;
    const tax = amount * 0.15;

    return this.invoiceRepo.save(this.invoiceRepo.create({
      tenantId,
      subscriptionId,
      invoiceNumber,
      amount,
      tax,
      total: amount + tax,
      status: InvoiceStatus.SENT,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      billingPeriodStart: start,
      billingPeriodEnd: end,
      items: [{ description: 'Platform subscription', quantity: 1, unitPrice: amount, total: amount }],
    }));
  }

  // Admin methods
  async getAllSubscriptions(page = 1, limit = 20) {
    const [subs, total] = await this.subRepo.findAndCount({
      relations: ['tenant', 'plan'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { subscriptions: subs, total, page, limit };
  }
}
