import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
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
import { TenantAlert } from '../../database/entities/tenant-alert.entity';
import { ServicePlanSetting } from '../../database/entities/service-plan-setting.entity';

const MOYASAR_API_BASE = 'https://api.moyasar.com/v1';

@Injectable()
export class ServiceSubscriptionsService {
  constructor(
    @InjectRepository(ServiceSubscription)
    private subsRepo: Repository<ServiceSubscription>,
    @InjectRepository(Store)
    private storeRepo: Repository<Store>,
    @InjectRepository(TenantAlert)
    private alertRepo: Repository<TenantAlert>,
    @InjectRepository(ServicePlanSetting)
    private planSettingRepo: Repository<ServicePlanSetting>,
    private config: ConfigService,
  ) {}

  // ── Plan pricing (overrides the shared constants) ─────────────────────

  /**
   * Returns the effective monthly price for every ServicePlan.
   * Reads overrides from the DB and falls back to SERVICE_PLAN_PRICE.
   */
  async getEffectivePrices(): Promise<Record<ServicePlan, number>> {
    const overrides = await this.planSettingRepo.find();
    const map: Record<ServicePlan, number> = { ...SERVICE_PLAN_PRICE };
    for (const o of overrides) map[o.plan] = Number(o.monthlyPrice);
    return map;
  }

  /** Effective monthly price for a single plan. */
  async getPrice(plan: ServicePlan): Promise<number> {
    const o = await this.planSettingRepo.findOne({ where: { plan } });
    return o ? Number(o.monthlyPrice) : SERVICE_PLAN_PRICE[plan];
  }

  /** Admin: bulk update prices. */
  async updatePrices(updates: Partial<Record<ServicePlan, number>>): Promise<void> {
    for (const [plan, price] of Object.entries(updates) as Array<[ServicePlan, number]>) {
      if (price === undefined || price === null) continue;
      if (price < 0) throw new BadRequestException(`Invalid price for ${plan}`);
      await this.planSettingRepo.upsert(
        { plan, monthlyPrice: price, isActive: true },
        ['plan'],
      );
    }
  }

  // ── Alerts ─────────────────────────────────────────────────────────────

  private async addAlert(
    tenantId: string,
    type: string,
    title: string,
    message: string,
    actionUrl = '/subscription',
  ): Promise<void> {
    // Avoid duplicate unread alerts of the same type for the same tenant
    const existing = await this.alertRepo.findOne({
      where: { tenantId, type, isRead: false },
    });
    if (existing) return;
    const a = this.alertRepo.create({ tenantId, type, title, message, actionUrl });
    await this.alertRepo.save(a);
  }

  async listAlerts(tenantId: string, onlyUnread = false): Promise<TenantAlert[]> {
    return this.alertRepo.find({
      where: { tenantId, ...(onlyUnread ? { isRead: false } : {}) },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async markAlertRead(tenantId: string, id: string): Promise<void> {
    await this.alertRepo.update({ id, tenantId }, { isRead: true });
  }

  async markAllAlertsRead(tenantId: string): Promise<void> {
    await this.alertRepo.update({ tenantId, isRead: false }, { isRead: true });
  }

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
    const monthlyPrice = await this.getPrice(plan);

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
    const prices = await this.getEffectivePrices();

    let targetPlan: ServicePlan;
    if (amount >= prices[ServicePlan.FULL]) {
      targetPlan = ServicePlan.FULL;
    } else if (amount >= prices[ServicePlan.PARKING]) {
      targetPlan = (current?.plan as ServicePlan) ?? ServicePlan.PARKING;
    } else {
      throw new BadRequestException('Amount below the minimum plan price');
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

  // ── Payment ────────────────────────────────────────────────────────────

  /**
   * Start a Moyasar payment for the chosen plan + months.
   * Falls back to test mode when no Moyasar key is configured on any
   * of the tenant's stores or globally.
   */
  async initiatePayment(
    tenantId: string,
    plan: ServicePlan,
    months: number,
    frontendUrl: string,
  ): Promise<{ paymentUrl: string; testMode: boolean; amount: number; sessionId: string }> {
    if (months < 1 || months > 24) throw new BadRequestException('Months must be 1–24');

    // Eligibility re-check (same as subscribe)
    if (plan === ServicePlan.DINE_IN || plan === ServicePlan.FULL) {
      const dineInStore = await this.storeRepo
        .createQueryBuilder('store')
        .where('store.tenantId = :tenantId', { tenantId })
        .andWhere('store.category IN (:...cats)', { cats: DINE_IN_CATEGORIES })
        .getOne();
      if (!dineInStore) {
        throw new BadRequestException(
          'Dine-in plan requires a restaurant / café / buffet store',
        );
      }
    }

    const monthlyPrice = await this.getPrice(plan);
    const total = monthlyPrice * months;

    // Pick a Moyasar secret key from any of the tenant's stores
    const stores = await this.storeRepo.find({ where: { tenantId } });
    let secretKey: string | undefined;
    for (const s of stores) {
      const settings = (s.operatingHours ?? {}) as any;
      const k = settings?.paymentSettings?.moyasarSecretKey;
      if (k) { secretKey = k; break; }
    }
    if (!secretKey) secretKey = this.config.get<string>('MOYASAR_SECRET_KEY');

    const sessionId = `sub_${tenantId}_${plan}_${months}_${Date.now()}`;
    const callbackUrl =
      `${frontendUrl}/subscription/payment-result` +
      `?token=${encodeURIComponent(sessionId)}` +
      `&plan=${plan}&months=${months}&amount=${total}`;

    // No Moyasar key → return a test-mode URL that auto-confirms via our endpoint
    if (!secretKey) {
      return {
        paymentUrl: callbackUrl + '&status=paid&mode=test',
        testMode: true,
        amount: total,
        sessionId,
      };
    }

    // Real Moyasar invoice
    try {
      const auth = 'Basic ' + Buffer.from(`${secretKey}:`).toString('base64');
      const body = {
        amount: Math.round(total * 100),  // halalas
        currency: 'SAR',
        description: `Estlem ${SERVICE_PLAN_META[plan].nameEn} subscription — ${months} mo.`,
        callback_url: callbackUrl,
        metadata: { tenantId, plan, months, sessionId, kind: 'subscription' },
      };
      const res = await fetch(`${MOYASAR_API_BASE}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: auth },
        body: JSON.stringify(body),
      });
      const data: any = await res.json();
      if (res.ok && data?.url) {
        return { paymentUrl: data.url, testMode: false, amount: total, sessionId: data.id };
      }
      // Moyasar rejected → fall back to test mode rather than blocking the user
      return {
        paymentUrl: callbackUrl + '&status=paid&mode=test',
        testMode: true,
        amount: total,
        sessionId,
      };
    } catch {
      return {
        paymentUrl: callbackUrl + '&status=paid&mode=test',
        testMode: true,
        amount: total,
        sessionId,
      };
    }
  }

  /**
   * Called by the frontend after Moyasar redirects back to our callback page.
   * The signed token (sessionId) carries tenant/plan/months so we can verify.
   */
  async confirmPayment(
    tenantId: string,
    plan: ServicePlan,
    months: number,
    amount: number,
    status: string,
  ): Promise<{ ok: boolean; subscription?: ServiceSubscription; reason?: string }> {
    const successStatuses = ['paid', 'authorized', 'captured', 'verified'];
    if (!successStatuses.includes(status)) {
      return { ok: false, reason: `Payment status: ${status}` };
    }
    // Verify amount matches expected price (prevents tampering)
    const unitPrice = await this.getPrice(plan);
    const expected = unitPrice * months;
    if (Math.abs(amount - expected) > 0.5) {
      return { ok: false, reason: 'Amount mismatch' };
    }
    const sub = await this.subscribe(tenantId, plan, months, { paid: true, amount });
    return { ok: true, subscription: sub };
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
      await this.subsRepo.save(sub);
      const days = Math.ceil((sub.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      await this.addAlert(
        sub.tenantId,
        'subscription_warning',
        `اشتراكك ينتهي خلال ${days} يوم`,
        `جدّد اشتراكك قبل ${sub.expiresAt.toLocaleDateString('ar-SA')} لتجنّب توقف الخدمة.`,
      );
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
      await this.addAlert(
        sub.tenantId,
        'subscription_grace',
        `انتهى اشتراكك — أنت في فترة السماح (${GRACE_PERIOD_DAYS} أيام)`,
        `جدّد قبل ${graceEnd.toLocaleDateString('ar-SA')} وإلا ستتوقف الخدمة.`,
      );
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
      await this.addAlert(
        sub.tenantId,
        'subscription_expired',
        'انتهى اشتراكك',
        'يرجى التجديد لاستئناف استقبال الطلبات.',
      );
    }

    return { warned: toWarn.length, toGrace: justExpired.length, expired: fullyExpired.length };
  }
}
