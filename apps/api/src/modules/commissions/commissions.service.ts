import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { CommissionRule } from '../../database/entities/commission-rule.entity';
import { CommissionTransaction } from '../../database/entities/commission-transaction.entity';
import { CommissionType, CommissionStatus } from '@estlem/shared';

@Injectable()
export class CommissionsService {
  constructor(
    @InjectRepository(CommissionRule)
    private ruleRepo: Repository<CommissionRule>,
    @InjectRepository(CommissionTransaction)
    private txRepo: Repository<CommissionTransaction>,
  ) {}

  async calculateCommission(tenantId: string, orderTotal: number): Promise<number> {
    const rule = await this.getActiveRule(tenantId);
    if (!rule || rule.type === CommissionType.NONE) return 0;

    if (rule.type === CommissionType.FIXED) return Number(rule.value);

    if (rule.type === CommissionType.PERCENTAGE) {
      let amount = orderTotal * (Number(rule.value) / 100);
      if (rule.minAmount && amount < Number(rule.minAmount)) amount = Number(rule.minAmount);
      if (rule.maxAmount && amount > Number(rule.maxAmount)) amount = Number(rule.maxAmount);
      return Math.round(amount * 100) / 100;
    }

    return 0;
  }

  async recordCommission(tenantId: string, orderId: string, orderTotal: number) {
    const rule = await this.getActiveRule(tenantId);
    const amount = await this.calculateCommission(tenantId, orderTotal);
    if (amount <= 0) return null;

    return this.txRepo.save(this.txRepo.create({
      tenantId,
      orderId,
      orderTotal,
      commissionType: rule.type,
      commissionRate: rule.value,
      commissionAmount: amount,
      status: CommissionStatus.PENDING,
    }));
  }

  async getActiveRule(tenantId: string): Promise<CommissionRule | null> {
    // Tenant-specific rule takes priority
    let rule = await this.ruleRepo.findOne({ where: { tenantId, isActive: true } });
    if (rule) return rule;
    // Fallback to global rule
    return this.ruleRepo.findOne({ where: { isGlobal: true, isActive: true } });
  }

  // Admin methods
  async getGlobalRule() {
    return this.ruleRepo.findOne({ where: { isGlobal: true } });
  }

  async setGlobalRule(type: CommissionType, value: number, minAmount = 0, maxAmount?: number) {
    let rule = await this.ruleRepo.findOne({ where: { isGlobal: true } });
    if (rule) {
      rule.type = type;
      rule.value = value;
      rule.minAmount = minAmount;
      rule.maxAmount = maxAmount || null;
    } else {
      rule = this.ruleRepo.create({ isGlobal: true, type, value, minAmount, maxAmount, isActive: true });
    }
    return this.ruleRepo.save(rule);
  }

  async setTenantRule(tenantId: string, type: CommissionType, value: number) {
    let rule = await this.ruleRepo.findOne({ where: { tenantId } });
    if (rule) {
      rule.type = type;
      rule.value = value;
    } else {
      rule = this.ruleRepo.create({ tenantId, isGlobal: false, type, value, isActive: true });
    }
    return this.ruleRepo.save(rule);
  }

  async removeTenantRule(tenantId: string) {
    const rule = await this.ruleRepo.findOne({ where: { tenantId } });
    if (!rule) throw new NotFoundException('No tenant-specific rule found');
    await this.ruleRepo.remove(rule);
    return { success: true };
  }

  async getReport(options?: { tenantId?: string; startDate?: Date; endDate?: Date; page?: number; limit?: number }) {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const qb = this.txRepo.createQueryBuilder('ct');

    if (options?.tenantId) qb.andWhere('ct.tenant_id = :tenantId', { tenantId: options.tenantId });
    if (options?.startDate && options?.endDate) {
      qb.andWhere('ct.createdAt BETWEEN :start AND :end', { start: options.startDate, end: options.endDate });
    }

    const [transactions, total] = await qb
      .orderBy('ct.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const totalResult = await this.txRepo
      .createQueryBuilder('ct')
      .select('SUM(ct.commission_amount)', 'totalCommissions')
      .addSelect('COUNT(*)', 'totalTransactions')
      .where(options?.tenantId ? 'ct.tenant_id = :tenantId' : '1=1', { tenantId: options?.tenantId })
      .getRawOne();

    return {
      transactions,
      total,
      page,
      limit,
      totalCommissions: parseFloat(totalResult?.totalCommissions) || 0,
      totalTransactions: parseInt(totalResult?.totalTransactions) || 0,
    };
  }

  async markCollected(ids: string[]) {
    await this.txRepo
      .createQueryBuilder()
      .update()
      .set({ status: CommissionStatus.COLLECTED, collectedAt: new Date() })
      .whereInIds(ids)
      .execute();
    return { success: true, count: ids.length };
  }
}
