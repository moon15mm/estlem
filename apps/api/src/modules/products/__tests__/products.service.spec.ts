import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from '../products.service';
import { Product } from '../../../database/entities/product.entity';
import { ProductCategory } from '../../../database/entities/product-category.entity';

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn((dto) => ({ id: 'test-id', ...dto })),
  save: jest.fn((entity) => Promise.resolve(Array.isArray(entity) ? entity : { id: 'test-id', ...entity })),
  update: jest.fn(),
  softDelete: jest.fn(),
  findAndCount: jest.fn().mockResolvedValue([[], 0]),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getMany: jest.fn().mockResolvedValue([]),
  })),
});

describe('ProductsService', () => {
  let service: ProductsService;
  let productRepo: any;
  let categoryRepo: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getRepositoryToken(Product), useFactory: mockRepo },
        { provide: getRepositoryToken(ProductCategory), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    productRepo = module.get(getRepositoryToken(Product));
    categoryRepo = module.get(getRepositoryToken(ProductCategory));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a product', async () => {
      const dto = {
        name: 'Pepsi Can',
        nameAr: 'بيبسي علبة',
        price: 2.50,
        storeId: 'store-1',
        tenantId: 'tenant-1',
      };

      const result = await service.create(dto as any, 'store-1', 'tenant-1');
      expect(productRepo.create).toHaveBeenCalled();
      expect(productRepo.save).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return product when found', async () => {
      productRepo.findOne.mockResolvedValue({ id: 'prod-1', name: 'Pepsi', price: 2.50 });
      const result = await service.findById('prod-1', 'tenant-1');
      expect(result.name).toBe('Pepsi');
    });

    it('should throw NotFoundException', async () => {
      productRepo.findOne.mockResolvedValue(null);
      await expect(service.findById('missing', 'tenant-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByStore', () => {
    it('should return paginated products', async () => {
      productRepo.findAndCount.mockResolvedValue([
        [{ id: '1', name: 'Water' }, { id: '2', name: 'Pepsi' }],
        2,
      ]);

      const result = await service.findByStore('store-1', { page: 1, limit: 20 });
      expect(result).toBeDefined();
    });
  });

  describe('toggleActive', () => {
    it('should toggle product active status', async () => {
      productRepo.findOne.mockResolvedValue({ id: 'prod-1', isActive: true });
      productRepo.save.mockResolvedValue({ id: 'prod-1', isActive: false });

      const result = await service.toggleActive('prod-1', 'tenant-1');
      expect(productRepo.save).toHaveBeenCalled();
    });
  });
});
