import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OrdersService } from '../orders.service';
import { Order } from '../../../database/entities/order.entity';
import { OrderItem } from '../../../database/entities/order-item.entity';
import { Customer } from '../../../database/entities/customer.entity';
import { CustomerVehicle } from '../../../database/entities/customer-vehicle.entity';
import { ParkingSpot } from '../../../database/entities/parking-spot.entity';
import { Product } from '../../../database/entities/product.entity';
import { NotificationsService } from '../../notifications/notifications.service';
import { OrdersGateway } from '../../realtime/orders.gateway';
import { AiCartService } from '../ai-cart.service';
import { OrderStatus } from '@estlem/shared';

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn((dto) => ({ id: 'test-id', ...dto })),
  save: jest.fn((entity) => Promise.resolve({ id: 'test-id', ...entity })),
  update: jest.fn(),
  findAndCount: jest.fn().mockResolvedValue([[], 0]),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getCount: jest.fn().mockResolvedValue(0),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  })),
});

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepo: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useFactory: mockRepo },
        { provide: getRepositoryToken(OrderItem), useFactory: mockRepo },
        { provide: getRepositoryToken(Customer), useFactory: mockRepo },
        { provide: getRepositoryToken(CustomerVehicle), useFactory: mockRepo },
        { provide: getRepositoryToken(ParkingSpot), useFactory: mockRepo },
        { provide: getRepositoryToken(Product), useFactory: mockRepo },
        {
          provide: NotificationsService,
          useValue: { sendOrderNotification: jest.fn() },
        },
        {
          provide: OrdersGateway,
          useValue: { emitToStore: jest.fn(), emitToCustomer: jest.fn() },
        },
        {
          provide: AiCartService,
          useValue: { parseCart: jest.fn().mockResolvedValue({ items: [] }) },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn((cb) => cb({
              findOne: jest.fn(),
              create: jest.fn((entity, dto) => ({ id: 'new-id', ...dto })),
              save: jest.fn((entity) => Promise.resolve(entity)),
            })),
          },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    orderRepo = module.get(getRepositoryToken(Order));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByStore', () => {
    it('should return paginated orders', async () => {
      const mockOrders = [
        { id: '1', orderNumber: 'ORD-001', status: OrderStatus.NEW, total: 50 },
        { id: '2', orderNumber: 'ORD-002', status: OrderStatus.ACCEPTED, total: 75 },
      ];
      orderRepo.findAndCount.mockResolvedValue([mockOrders, 2]);

      const result = await service.findByStore('store-1', 'tenant-1', {});
      expect(result).toBeDefined();
    });
  });

  describe('findById', () => {
    it('should return order when found', async () => {
      const mockOrder = {
        id: 'order-1',
        orderNumber: 'ORD-001',
        status: OrderStatus.NEW,
        items: [],
      };
      orderRepo.findOne.mockResolvedValue(mockOrder);

      const result = await service.findById('order-1', 'tenant-1');
      expect(result.id).toBe('order-1');
    });

    it('should throw NotFoundException when not found', async () => {
      orderRepo.findOne.mockResolvedValue(null);
      await expect(service.findById('non-existent', 'tenant-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should reject invalid status transitions', async () => {
      orderRepo.findOne.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.DELIVERED,
        tenantId: 'tenant-1',
      });

      await expect(
        service.updateStatus('order-1', { status: OrderStatus.NEW } as any, 'tenant-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept valid status transition NEW → ACCEPTED', async () => {
      const order = {
        id: 'order-1',
        status: OrderStatus.NEW,
        tenantId: 'tenant-1',
        storeId: 'store-1',
      };
      orderRepo.findOne.mockResolvedValue(order);
      orderRepo.save.mockResolvedValue({ ...order, status: OrderStatus.ACCEPTED });

      const result = await service.updateStatus(
        'order-1',
        { status: OrderStatus.ACCEPTED, preparationMinutes: 15 } as any,
        'tenant-1',
      );
      expect(result.status).toBe(OrderStatus.ACCEPTED);
    });
  });
});
