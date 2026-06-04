import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { LoyaltyService } from '../loyalty.service';
import { LoyaltyAccount } from '../../../database/entities/loyalty-account.entity';
import { LoyaltyTransaction } from '../../../database/entities/loyalty-transaction.entity';
import { MembershipTier, LoyaltyTransactionType } from '@estlem/shared';

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn((dto) => ({ id: 'test-id', ...dto })),
  save: jest.fn((entity) => Promise.resolve(entity)),
  findAndCount: jest.fn().mockResolvedValue([[], 0]),
});

describe('LoyaltyService', () => {
  let service: LoyaltyService;
  let accountRepo: any;
  let txRepo: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoyaltyService,
        { provide: getRepositoryToken(LoyaltyAccount), useFactory: mockRepo },
        { provide: getRepositoryToken(LoyaltyTransaction), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get<LoyaltyService>(LoyaltyService);
    accountRepo = module.get(getRepositoryToken(LoyaltyAccount));
    txRepo = module.get(getRepositoryToken(LoyaltyTransaction));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOrCreateAccount', () => {
    it('should return existing account', async () => {
      const existing = {
        id: 'acc-1',
        customerId: 'cust-1',
        tenantId: 'tenant-1',
        totalPoints: 100,
        availablePoints: 80,
        tier: MembershipTier.BRONZE,
      };
      accountRepo.findOne.mockResolvedValue(existing);

      const result = await service.getOrCreateAccount('cust-1', 'tenant-1');
      expect(result.id).toBe('acc-1');
      expect(accountRepo.save).not.toHaveBeenCalled();
    });

    it('should create new account when none exists', async () => {
      accountRepo.findOne.mockResolvedValue(null);
      accountRepo.save.mockResolvedValue({ id: 'new-acc', customerId: 'cust-1', tier: MembershipTier.BRONZE });

      const result = await service.getOrCreateAccount('cust-1', 'tenant-1');
      expect(accountRepo.create).toHaveBeenCalled();
      expect(accountRepo.save).toHaveBeenCalled();
    });
  });

  describe('earnPoints', () => {
    it('should earn points based on order total', async () => {
      accountRepo.findOne.mockResolvedValue({
        id: 'acc-1',
        availablePoints: 100,
        totalPoints: 100,
        totalSpent: 200,
        totalVisits: 5,
        tier: MembershipTier.BRONZE,
      });

      const result = await service.earnPoints('cust-1', 'tenant-1', 'order-1', 150);
      expect(result.pointsEarned).toBe(150); // 1 point per SAR
      expect(txRepo.save).toHaveBeenCalled();
    });

    it('should upgrade tier when threshold reached', async () => {
      accountRepo.findOne.mockResolvedValue({
        id: 'acc-1',
        availablePoints: 400,
        totalPoints: 400,
        totalSpent: 450,
        totalVisits: 10,
        tier: MembershipTier.BRONZE,
      });

      const result = await service.earnPoints('cust-1', 'tenant-1', 'order-1', 100);
      expect(result.tier).toBe(MembershipTier.SILVER); // 500+ SAR → Silver
    });
  });

  describe('redeemPoints', () => {
    it('should redeem points and return discount', async () => {
      accountRepo.findOne.mockResolvedValue({
        id: 'acc-1',
        availablePoints: 500,
        redeemedPoints: 0,
      });

      const result = await service.redeemPoints('cust-1', 'tenant-1', 200);
      expect(result.discountAmount).toBe(2); // 200 * 0.01
      expect(result.remainingPoints).toBe(300);
    });

    it('should reject if insufficient points', async () => {
      accountRepo.findOne.mockResolvedValue({
        id: 'acc-1',
        availablePoints: 50,
      });

      await expect(
        service.redeemPoints('cust-1', 'tenant-1', 100),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if account not found', async () => {
      accountRepo.findOne.mockResolvedValue(null);
      await expect(
        service.redeemPoints('cust-1', 'tenant-1', 100),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTierThresholds', () => {
    it('should return all 4 tier thresholds', () => {
      const tiers = service.getTierThresholds();
      expect(Object.keys(tiers)).toHaveLength(4);
      expect(tiers[MembershipTier.BRONZE].minSpent).toBe(0);
      expect(tiers[MembershipTier.PLATINUM].minSpent).toBe(5000);
    });
  });
});
