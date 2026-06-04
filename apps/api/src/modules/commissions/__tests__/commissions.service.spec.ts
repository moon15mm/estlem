import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CommissionsService } from '../commissions.service';
import { CommissionRule } from '../../../database/entities/commission-rule.entity';
import { CommissionTransaction } from '../../../database/entities/commission-transaction.entity';
import { CommissionType } from '@estlem/shared';

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn((dto) => ({ id: 'test-id', ...dto })),
  save: jest.fn((entity) => Promise.resolve(entity)),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    whereInIds: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({}),
    getRawOne: jest.fn().mockResolvedValue({ totalCommissions: '500.00', totalTransactions: '10' }),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  })),
});

describe('CommissionsService', () => {
  let service: CommissionsService;
  let ruleRepo: any;
  let txRepo: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommissionsService,
        { provide: getRepositoryToken(CommissionRule), useFactory: mockRepo },
        { provide: getRepositoryToken(CommissionTransaction), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get<CommissionsService>(CommissionsService);
    ruleRepo = module.get(getRepositoryToken(CommissionRule));
    txRepo = module.get(getRepositoryToken(CommissionTransaction));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateCommission', () => {
    it('should calculate percentage commission', async () => {
      ruleRepo.findOne
        .mockResolvedValueOnce(null) // no tenant-specific rule
        .mockResolvedValueOnce({ type: CommissionType.PERCENTAGE, value: 5, isActive: true, isGlobal: true });

      const result = await service.calculateCommission('tenant-1', 100);
      expect(result).toBe(5); // 5% of 100
    });

    it('should return fixed commission', async () => {
      ruleRepo.findOne
        .mockResolvedValueOnce({ type: CommissionType.FIXED, value: 3, isActive: true, tenantId: 'tenant-1' });

      const result = await service.calculateCommission('tenant-1', 100);
      expect(result).toBe(3);
    });

    it('should return 0 for NONE type', async () => {
      ruleRepo.findOne
        .mockResolvedValueOnce({ type: CommissionType.NONE, value: 0, isActive: true });

      const result = await service.calculateCommission('tenant-1', 100);
      expect(result).toBe(0);
    });

    it('should return 0 if no rule exists', async () => {
      ruleRepo.findOne.mockResolvedValue(null);
      const result = await service.calculateCommission('tenant-1', 100);
      expect(result).toBe(0);
    });

    it('should respect min/max amounts for percentage', async () => {
      ruleRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          type: CommissionType.PERCENTAGE,
          value: 5,
          minAmount: 10,
          maxAmount: 50,
          isActive: true,
          isGlobal: true,
        });

      // 5% of 50 = 2.5, but minAmount is 10
      const result = await service.calculateCommission('tenant-1', 50);
      expect(result).toBe(10);
    });
  });

  describe('setGlobalRule', () => {
    it('should create new global rule', async () => {
      ruleRepo.findOne.mockResolvedValue(null);

      await service.setGlobalRule(CommissionType.PERCENTAGE, 7);
      expect(ruleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ isGlobal: true, type: CommissionType.PERCENTAGE, value: 7 }),
      );
      expect(ruleRepo.save).toHaveBeenCalled();
    });

    it('should update existing global rule', async () => {
      const existingRule = { id: 'rule-1', isGlobal: true, type: CommissionType.PERCENTAGE, value: 5 };
      ruleRepo.findOne.mockResolvedValue(existingRule);

      await service.setGlobalRule(CommissionType.FIXED, 3);
      expect(ruleRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ type: CommissionType.FIXED, value: 3 }),
      );
    });
  });

  describe('getReport', () => {
    it('should return report with totals', async () => {
      const result = await service.getReport({});
      expect(result).toHaveProperty('totalCommissions');
      expect(result).toHaveProperty('totalTransactions');
    });
  });
});
