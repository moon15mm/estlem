import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { StoresService } from '../stores.service';
import { Store } from '../../../database/entities/store.entity';
import { ParkingSpot } from '../../../database/entities/parking-spot.entity';
import { Tenant } from '../../../database/entities/tenant.entity';

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn((dto) => ({ id: 'test-id', ...dto })),
  save: jest.fn((entity) => Promise.resolve(entity)),
  update: jest.fn(),
  findAndCount: jest.fn().mockResolvedValue([[], 0]),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    having: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getRawAndEntities: jest.fn().mockResolvedValue({ entities: [], raw: [] }),
  })),
});

describe('StoresService', () => {
  let service: StoresService;
  let storeRepo: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoresService,
        { provide: getRepositoryToken(Store), useFactory: mockRepo },
        { provide: getRepositoryToken(ParkingSpot), useFactory: mockRepo },
        { provide: getRepositoryToken(Tenant), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get<StoresService>(StoresService);
    storeRepo = module.get(getRepositoryToken(Store));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return store with spots', async () => {
      const mockStore = {
        id: 'store-1',
        name: 'Test Grocery',
        tenantId: 'tenant-1',
        spots: [],
      };
      storeRepo.findOne.mockResolvedValue(mockStore);

      const result = await service.findById('store-1');
      expect(result.id).toBe('store-1');
    });

    it('should throw NotFoundException', async () => {
      storeRepo.findOne.mockResolvedValue(null);
      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByTenant', () => {
    it('should return tenant stores', async () => {
      storeRepo.find.mockResolvedValue([
        { id: 's1', name: 'Branch 1' },
        { id: 's2', name: 'Branch 2' },
      ]);

      const result = await service.findByTenant('tenant-1');
      expect(result).toHaveLength(2);
    });
  });
});
