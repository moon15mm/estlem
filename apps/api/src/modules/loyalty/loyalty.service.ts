import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoyaltyAccount } from '../../database/entities/loyalty-account.entity';
import { LoyaltyTransaction } from '../../database/entities/loyalty-transaction.entity';
import { MembershipTier, LoyaltyTransactionType } from '@estlem/shared';

@Injectable()
export class LoyaltyService {
  constructor(
    @InjectRepository(LoyaltyAccount)
    private accountRepo: Repository<LoyaltyAccount>,
    @InjectRepository(LoyaltyTransaction)
    private txRepo: Repository<LoyaltyTransaction>,
  ) {}

  async getOrCreateAccount(customerId: string, tenantId: string) {
    let account = await this.accountRepo.findOne({ where: { customerId, tenantId } });
    if (!account) {
      account = this.accountRepo.create({
        customerId,
        tenantId,
        totalPoints: 0,
        availablePoints: 0,
        redeemedPoints: 0,
        tier: MembershipTier.BRONZE,
        totalSpent: 0,
        totalVisits: 0,
      });
      await this.accountRepo.save(account);
    }
    return account;
  }

  async earnPoints(customerId: string, tenantId: string, orderId: string, orderTotal: number, pointsPerSar = 1) {
    const account = await this.getOrCreateAccount(customerId, tenantId);
    const pointsEarned = Math.floor(orderTotal * pointsPerSar);

    account.availablePoints += pointsEarned;
    account.totalPoints += pointsEarned;
    account.totalSpent = Number(account.totalSpent) + orderTotal;
    account.totalVisits += 1;

    // Auto tier upgrade
    const spent = Number(account.totalSpent);
    if (spent >= 5000) account.tier = MembershipTier.PLATINUM;
    else if (spent >= 2000) account.tier = MembershipTier.GOLD;
    else if (spent >= 500) account.tier = MembershipTier.SILVER;

    await this.accountRepo.save(account);

    await this.txRepo.save(this.txRepo.create({
      accountId: account.id,
      tenantId,
      orderId,
      type: LoyaltyTransactionType.EARN,
      points: pointsEarned,
      balanceAfter: account.availablePoints,
      description: `Earned from order`,
    }));

    return { pointsEarned, totalPoints: account.availablePoints, tier: account.tier };
  }

  async redeemPoints(customerId: string, tenantId: string, points: number, sarPerPoint = 0.01) {
    const account = await this.accountRepo.findOne({ where: { customerId, tenantId } });
    if (!account) throw new NotFoundException('Loyalty account not found');
    if (account.availablePoints < points) throw new BadRequestException('Insufficient points');

    const discountAmount = points * sarPerPoint;
    account.availablePoints -= points;
    account.redeemedPoints += points;
    await this.accountRepo.save(account);

    await this.txRepo.save(this.txRepo.create({
      accountId: account.id,
      tenantId,
      type: LoyaltyTransactionType.REDEEM,
      points: -points,
      balanceAfter: account.availablePoints,
      description: `Redeemed ${points} points for ${discountAmount} SAR discount`,
    }));

    return { discountAmount, remainingPoints: account.availablePoints };
  }

  async getCustomerAccount(customerId: string, tenantId: string) {
    const account = await this.accountRepo.findOne({
      where: { customerId, tenantId },
    });
    if (!account) return { totalPoints: 0, availablePoints: 0, tier: MembershipTier.BRONZE };
    return account;
  }

  async getTransactions(customerId: string, tenantId: string, page = 1, limit = 20) {
    const account = await this.accountRepo.findOne({ where: { customerId, tenantId } });
    if (!account) return { transactions: [], total: 0, page, limit };

    const [transactions, total] = await this.txRepo.findAndCount({
      where: { accountId: account.id },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { transactions, total, page, limit };
  }

  async addBonusPoints(customerId: string, tenantId: string, points: number, description: string) {
    const account = await this.getOrCreateAccount(customerId, tenantId);
    account.availablePoints += points;
    account.totalPoints += points;
    await this.accountRepo.save(account);

    await this.txRepo.save(this.txRepo.create({
      accountId: account.id,
      tenantId,
      type: LoyaltyTransactionType.BONUS,
      points,
      balanceAfter: account.availablePoints,
      description,
    }));

    return account;
  }

  // Merchant: get all loyalty members
  async getTenantMembers(tenantId: string, page = 1, limit = 20) {
    const [accounts, total] = await this.accountRepo.findAndCount({
      where: { tenantId },
      relations: ['customer'],
      order: { totalPoints: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { members: accounts, total, page, limit };
  }

  // Tier thresholds config
  getTierThresholds() {
    return {
      [MembershipTier.BRONZE]: { minSpent: 0, description: 'Starting tier' },
      [MembershipTier.SILVER]: { minSpent: 500, description: '500+ SAR spent' },
      [MembershipTier.GOLD]: { minSpent: 2000, description: '2000+ SAR spent' },
      [MembershipTier.PLATINUM]: { minSpent: 5000, description: '5000+ SAR spent' },
    };
  }
}
