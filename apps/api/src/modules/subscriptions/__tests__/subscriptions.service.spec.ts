import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SubscriptionsService } from '../subscriptions.service';
import { Subscription } from '../../../database/entities/subscription.entity';
import { SubscriptionPlan } from '../../../database/entities/subscription-plan.entity';
import { Invoice } from '../../../database/entities/invoice.entity';
import { Tenant } from '../../../database/entities/tenant.entity';
import { TenantPlan, SubscriptionStatus, BillingCycle } from '@estlem/shared';

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn((dto) => ({ id: 'test-id', ...dto })),
  save: jest.fn((entity) => Promise.resolve(entity)),
  update: jest.fn(),
  count: jest.fn().mockResolvedValue(0),
  findAndCount: jest.fn().mockResolvedValue([[], 0]),
});

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let subRepo: any;
  let planRepo: any;
  let invoiceRepo: any;
  let tenantRepo: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: getRepositoryToken(Subscription), useFactory: mockRepo },
        { provide: getRepositoryToken(SubscriptionPlan), useFactory: mockRepo },
        { provide: getRepositoryToken(Invoice), useFactory: mockRepo },
        { provide: getRepositoryToken(Tenant), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
    subRepo = module.get(getRepositoryToken(Subscription));
    planRepo = module.get(getRepositoryToken(SubscriptionPlan));
    invoiceRepo = module.get(getRepositoryToken(Invoice));
    tenantRepo = module.get(getRepositoryToken(Tenant));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPlans', () => {
    it('should return active plans sorted by order', async () => {
      const mockPlans = [
        { id: '1', name: 'Starter', tier: TenantPlan.STARTER, isActive: true },
        { id: '2', name: 'Growth', tier: TenantPlan.GROWTH, isActive: true },
      ];
      planRepo.find.mockResolvedValue(mockPlans);

      const result = await service.getPlans();
      expect(result).toHaveLength(2);
      expect(planRepo.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { sortOrder: 'ASC' },
      });
    });
  });

  describe('subscribe', () => {
    it('should create subscription for valid plan', async () => {
      planRepo.findOne.mockResolvedValue({
        id: 'plan-1',
        tier: TenantPlan.STARTER,
        monthlyPrice: 99,
        yearlyPrice: 990,
        isActive: true,
      });
      subRepo.findOne.mockResolvedValue(null); // no existing active sub
      invoiceRepo.count.mockResolvedValue(0);

      const result = await service.subscribe('tenant-1', TenantPlan.STARTER, BillingCycle.MONTHLY);
      expect(result).toBeDefined();
      expect(subRepo.save).toHaveBeenCalled();
      expect(tenantRepo.update).toHaveBeenCalledWith('tenant-1', {
        plan: TenantPlan.STARTER,
        status: 'active',
      });
    });

    it('should reject if plan not found', async () => {
      planRepo.findOne.mockResolvedValue(null);
      await expect(
        service.subscribe('tenant-1', TenantPlan.ENTERPRISE, BillingCycle.MONTHLY),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject if already has active subscription', async () => {
      planRepo.findOne.mockResolvedValue({ id: 'plan-1', isActive: true });
      subRepo.findOne.mockResolvedValue({ id: 'existing-sub', status: SubscriptionStatus.ACTIVE });

      await expect(
        service.subscribe('tenant-1', TenantPlan.STARTER, BillingCycle.MONTHLY),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancel', () => {
    it('should cancel active subscription', async () => {
      const mockSub = {
        id: 'sub-1',
        status: SubscriptionStatus.ACTIVE,
        autoRenew: true,
      };
      subRepo.findOne.mockResolvedValue(mockSub);

      const result = await service.cancel('tenant-1');
      expect(result.status).toBe(SubscriptionStatus.CANCELLED);
      expect(result.autoRenew).toBe(false);
    });

    it('should throw if no active subscription', async () => {
      subRepo.findOne.mockResolvedValue(null);
      await expect(service.cancel('tenant-1')).rejects.toThrow(NotFoundException);
    });
  });
});
