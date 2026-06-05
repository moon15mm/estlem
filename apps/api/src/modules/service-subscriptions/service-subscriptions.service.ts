import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  ServicePlan,
  SubscriptionStatus,
  SERVICE_PLAN_PRICE,
  SERVICE_PLAN_META,
  GRACE_PERIOD_DAYS,
  RENEWAL_WARNING_DAYS,
  DINE_IN_CATEGORIES,
  StoreCategory,
} from '@estlem/shared';
import { ServiceSubscription } from '../../database/entities/service-subscription.entity';
import { Store } from '../../database/entities/store.entity';

@Injectable()
export class ServiceSubscriptionsService {
  constructor(
    @InjectRepository(ServiceSubscription)
    private subsRepo: Repository<ServiceSubscription>,
    @InjectRepository(Store)
    private storeRepo: Repository<Store>,
  ) {}

  // ── Queries ────────────────────────────────────────────────────────────

  /** Current subscription for a tenant (whatever status). */
  async getCurrent(tenantId: string): Promise<ServiceSubscription | null> {
    return this.subsRepo.findOne({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  /** All subscriptions across all tenants — admin view. */
  async listAll(): Promise<ServiceSubscription[]> {
    return this.subsRepo.find({ order: { createdAt: 'DESC' } });
  }

  // ── Mutations ──────────────────────────────────────────────────────────

  /**
   * Create or renew a subscription for a tenant.
   * - If the tenant has no active sub, creates one starting now.
   * - If they have an active/grace one, extends from the current end date.
   * - Enforces that DINE_IN/FULL are only available to dine-in store categories.
   */
  async subscribe(
    tenantId: string,
    plan: ServicePlan,
    months = 1,
    options: { paid?: boolean; amount?: number } = {},
  ): Promise<ServiceSubscription> {
    if (months < 1 || months > 24) {
      throw new BadRequestException('Months must be between 1 and 24');
    }

    // Eligibility check: DINE_IN / FULL require at least one dine-in capable store
    if (plan === ServicePlan.DINE_IN || plan === ServicePlan.FULL) {
      const dineInStore = await this.storeRepo
        .createQueryBuilder('store')
        .where('store.tenantId = :tenantId', { tenantId })
        .andWhere('store.category IN (:...cats)', { cats: DINE_IN_CATEGORIES })
        .getOne();
      if (!dineInStore) {
        throw new BadRequestException(
          'Dine-in plan requires at least one restaurant / café / buffet store',
        );
      }
    }

    const current = await this.getCurrent(tenantId);
    const now = new Date();
    const monthlyPrice = SERVICE_PLAN_PRICE[plan];

    // Start from the later of "now" or "current expiry" so renewals stack up
    const startBase =
      current && current.expiresAt > now && current.status !== SubscriptionStatus.CANCELLED
        ? new Date(current.expiresAt)
        : now;

    const expiresAt = new Date(startBase);
    expiresAt.setMonth(expiresAt.getMonth() + months);

    // If they already have an active subscription, update it (and bump plan if needed)
    if (current && current.status !== SubscriptionStatus.CANCELLED && current.status !== SubscriptionStatus.EXPIRED) {
      current.plan = plan;
      current.monthlyPrice = monthlyPrice;
      current.expiresAt = expiresAt;
      current.graceEndsAt = null;
      current.status = SubscriptionStatus.ACTIVE;
      if (options.paid) {
        current.lastPaymentAt = now;
        current.lastPaymentAmount = options.amount ?? monthlyPrice * months;
      }
      current.lastWarningAt = null;
      return this.subsRepo.save(current);
    }

    // Otherwise create a new subscription
    const sub = this.subsRepo.create({
      tenantId,
      plan,
      monthlyPrice,
      startedAt: now,
      expiresAt,
      status: SubscriptionStatus.ACTIVE,
      autoRenew: true,
      lastPaymentAt: options.paid ? now : null,
      lastPaymentAmount: options.paid ? (options.amount ?? monthlyPrice * months) : null,
    });
    return this.subsRepo.save(sub);
  }

  /**
   * Smart upgrade based on a payment amount.
   * - 99 → renew current plan (or PARKING if none)
   * - 198 → upgrade to FULL
   * - anything else → renew current plan if available, otherwise PARKING
   */
  async handlePayment(tenantId: string, amount: number): Promise<ServiceSubscription> {
    const months = 1;
    const current = await this.getCurrent(tenantId);

    let targetPlan: ServicePlan;
    if (amount >= SERVICE_PLAN_PRICE[ServicePlan.FULL]) {
      targetPlan = ServicePlan.FULL;
    } else if (amount >= SERVICE_PLAN_PRICE[ServicePlan.PARKING]) {
      targetPlan = (current?.plan as ServicePlan) ?? ServicePlan.PARKING;
    } else {
      throw new BadRequestException('Amount below the minimum plan price (99 SAR)');
    }

    return this.subscribe(tenantId, targetPlan, months, { paid: true, amount });
  }

  async cancel(tenantId: string): Promise<ServiceSubscription> {
    const current = await this.getCurrent(tenantId);
    if (!current) throw new NotFoundException('No active subscription');
    current.autoRenew = false;
    current.status = SubscriptionStatus.CANCELLED;
    return this.subsRepo.save(current);
  }

  async setPlan(
    tenantId: string,
    plan: ServicePlan,
    months: number,
  ): Promise<ServiceSubscription> {
    // Admin override — equivalent to subscribe() but doesn't require payment
    return this.subscribe(tenantId, plan, months);
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  /**
   * Does this tenant currently have permission to use the given service mode?
   * Used by stores controller to gate /stores/:id/languages-style settings.
   */
  async canUse(tenantId: string, mode: 'drive_through' | 'dine_in'): Promise<boolean> {
    const current = await this.getCurrent(tenantId);
    if (!current) return false;
    if (
      current.status !== SubscriptionStatus.ACTIVE &&
      current.status !== SubscriptionStatus.GRACE &&
      current.status !== SubscriptionStatus.TRIAL
    ) {
      return false;
    }
    return SERVICE_PLAN_META[current.plan].includes.includes(mode);
  }

  // ── Cron — run every day at 02:00 server time ──────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async dailySweep(): Promise<{ warned: number; toGrace: number; expired: number }> {
    const now = new Date();
    const warnThreshold = new Date(now);
    warnThreshold.setDate(warnThreshold.getDate() + RENEWAL_WARNING_DAYS);

    // 1. Subscriptions that just entered the warning window (≤7 days to expiry)
    const upcomingExpiry = await this.subsRepo.find({
      where: {
        status: SubscriptionStatus.ACTIVE,
        expiresAt: LessThanOrEqual(warnThreshold),
      },
    });
    const toWarn = upcomingExpiry.filter(
      (s) => s.expiresAt > now && (!s.lastWarningAt || s.lastWarningAt < s.expiresAt),
    );
    for (const sub of toWarn) {
      sub.lastWarningAt = now;
      // Hook: emit notification (email/SMS/push) — TODO wire to notifications module
      await this.subsRepo.save(sub);
    }

    // 2. Subscriptions whose expiresAt has just passed → move to GRACE
    const justExpired = await this.subsRepo.find({
      where: {
        status: SubscriptionStatus.ACTIVE,
        expiresAt: LessThanOrEqual(now),
      },
    });
    for (const sub of justExpired) {
      const graceEnd = new Date(sub.expiresAt);
      graceEnd.setDate(graceEnd.getDate() + GRACE_PERIOD_DAYS);
      sub.status = SubscriptionStatus.GRACE;
      sub.graceEndsAt = graceEnd;
      await this.subsRepo.save(sub);
    }

    // 3. Grace-period subs whose graceEndsAt has passed → EXPIRED
    const fullyExpired = await this.subsRepo
      .createQueryBuilder('s')
      .where('s.status = :s', { s: SubscriptionStatus.GRACE })
      .andWhere('s.graceEndsAt IS NOT NULL')
      .andWhere('s.graceEndsAt <= :now', { now })
      .getMany();
    for (const sub of fullyExpired) {
      sub.status = SubscriptionStatus.EXPIRED;
      await this.subsRepo.save(sub);
    }

    return { warned: toWarn.length, toGrace: justExpired.length, expired: fullyExpired.length };
  }
}
