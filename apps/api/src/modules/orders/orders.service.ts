import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { OrderStatus, OrderType, WsEvent } from '@estlem/shared';
import { Order } from '../../database/entities/order.entity';
import { OrderItem } from '../../database/entities/order-item.entity';
import { Customer } from '../../database/entities/customer.entity';
import { CustomerVehicle } from '../../database/entities/customer-vehicle.entity';
import { ParkingSpot } from '../../database/entities/parking-spot.entity';
import { Product } from '../../database/entities/product.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { OrdersGateway } from '../realtime/orders.gateway';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { AiCartService } from './ai-cart.service';

const TAX_RATE = 0.15; // 15% VAT

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private itemRepo: Repository<OrderItem>,
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    @InjectRepository(CustomerVehicle) private vehicleRepo: Repository<CustomerVehicle>,
    @InjectRepository(ParkingSpot) private spotRepo: Repository<ParkingSpot>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    private notifications: NotificationsService,
    private gateway: OrdersGateway,
    private aiCart: AiCartService,
    private dataSource: DataSource,
  ) {}

  async create(dto: CreateOrderDto, storeId: string, tenantId: string): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      // Upsert customer
      let customer = await manager.findOne(Customer, {
        where: { mobile: dto.customer.mobile },
        relations: ['vehicles'],
      });
      if (!customer) {
        customer = manager.create(Customer, {
          mobile: dto.customer.mobile,
          fullName: dto.customer.fullName,
        });
        await manager.save(customer);
      } else if (dto.customer.fullName && !customer.fullName) {
        customer.fullName = dto.customer.fullName;
        await manager.save(customer);
      }

      // Upsert vehicle
      let vehicle: CustomerVehicle | null = null;
      if (dto.customer.vehicle) {
        vehicle = manager.create(CustomerVehicle, {
          customerId: customer.id,
          ...dto.customer.vehicle,
          isDefault: true,
        });
        await manager.save(vehicle);
      }

      // Resolve parking spot
      let spot: ParkingSpot | null = null;
      if (dto.parkingSpotId) {
        spot = await manager.findOne(ParkingSpot, { where: { id: dto.parkingSpotId } });
      }

      // Build items
      let items: Partial<OrderItem>[] = [];
      let subtotal = 0;

      if (dto.type === OrderType.FREE_TEXT && dto.rawRequest) {
        const parsed = await this.aiCart.parseShoppingList(dto.rawRequest, storeId);
        items = parsed.map((p) => ({
          productId: p.productId ?? null,
          nameSnapshot: p.name,
          nameArSnapshot: p.nameAr,
          priceSnapshot: p.price,
          quantity: p.quantity,
        }));
        subtotal = items.reduce((s, i) => s + (i.priceSnapshot! * i.quantity!), 0);
      } else if (dto.items?.length) {
        for (const dtoItem of dto.items) {
          let name = dtoItem.nameSnapshot;
          let nameAr = dtoItem.nameArSnapshot ?? dtoItem.nameSnapshot;
          let price = dtoItem.priceSnapshot;

          if (dtoItem.productId) {
            const product = await manager.findOne(Product, { where: { id: dtoItem.productId } });
            if (product) {
              name = product.name;
              nameAr = product.nameAr;
              price = product.salePrice ?? product.price;
              // Decrement stock
              product.stockQuantity = Math.max(0, product.stockQuantity - dtoItem.quantity);
              await manager.save(product);
            }
          }

          subtotal += price * dtoItem.quantity;
          items.push({
            productId: dtoItem.productId ?? null,
            nameSnapshot: name,
            nameArSnapshot: nameAr,
            priceSnapshot: price,
            quantity: dtoItem.quantity,
            notes: dtoItem.notes,
          });
        }
      }

      const tax = parseFloat((subtotal * TAX_RATE).toFixed(2));
      const total = parseFloat((subtotal + tax).toFixed(2));

      const order = manager.create(Order, {
        tenantId,
        storeId,
        customerId: customer.id,
        vehicleId: vehicle?.id ?? null,
        parkingSpotId: spot?.id ?? null,
        orderNumber: this.generateOrderNumber(),
        type: dto.type,
        status: OrderStatus.NEW,
        paymentMethod: dto.paymentMethod,
        notes: dto.notes,
        rawRequest: dto.rawRequest,
        subtotal,
        tax,
        total,
      });

      await manager.save(order);

      const savedItems = items.map((i) =>
        manager.create(OrderItem, { ...i, orderId: order.id }),
      );
      await manager.save(savedItems);

      const fullOrder = await manager.findOne(Order, {
        where: { id: order.id },
        relations: ['items', 'customer', 'vehicle', 'parkingSpot'],
      });

      // Emit to staff room
      this.gateway.emitToStore(storeId, WsEvent.ORDER_CREATED, fullOrder);

      // Notify customer
      await this.notifications.sendOrderStatus(fullOrder!, customer);

      return fullOrder!;
    });
  }

  async updateStatus(
    orderId: string,
    dto: UpdateOrderStatusDto,
    staffId: string,
    tenantId: string,
  ): Promise<Order> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, tenantId },
      relations: ['customer', 'items', 'parkingSpot', 'vehicle'],
    });
    if (!order) throw new NotFoundException('Order not found');

    this.validateStatusTransition(order.status, dto.status);

    order.status = dto.status;
    order.assignedStaffId = staffId;
    if (dto.estimatedMins) order.estimatedMins = dto.estimatedMins;
    if (dto.status === OrderStatus.DELIVERED) order.deliveredAt = new Date();

    await this.orderRepo.save(order);

    this.gateway.emitToStore(order.storeId, WsEvent.ORDER_STATUS_UPDATED, {
      orderId: order.id,
      status: order.status,
      estimatedMins: order.estimatedMins,
    });

    this.gateway.emitToCustomer(order.customerId, WsEvent.ORDER_STATUS_UPDATED, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      estimatedMins: order.estimatedMins,
    });

    await this.notifications.sendOrderStatus(order, order.customer);

    return order;
  }

  async findByStore(storeId: string, tenantId: string, query: Record<string, string>) {
    const qb = this.orderRepo
      .createQueryBuilder('order')
      .where('order.storeId = :storeId AND order.tenantId = :tenantId', { storeId, tenantId })
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.vehicle', 'vehicle')
      .leftJoinAndSelect('order.parkingSpot', 'parkingSpot')
      .leftJoinAndSelect('order.items', 'items')
      .orderBy('order.createdAt', 'DESC');

    if (query.status) qb.andWhere('order.status = :status', { status: query.status });
    if (query.date) {
      const d = new Date(query.date);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      qb.andWhere('order.createdAt >= :d AND order.createdAt < :next', { d, next });
    }

    const limit = parseInt(query.limit ?? '50', 10);
    const offset = parseInt(query.offset ?? '0', 10);
    qb.take(limit).skip(offset);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async findById(orderId: string): Promise<Order> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['items', 'customer', 'vehicle', 'parkingSpot', 'payments'],
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  private validateStatusTransition(current: OrderStatus, next: OrderStatus) {
    const allowed: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.NEW]: [OrderStatus.ACCEPTED, OrderStatus.CANCELLED],
      [OrderStatus.ACCEPTED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
      [OrderStatus.PREPARING]: [OrderStatus.READY],
      [OrderStatus.READY]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELLED]: [],
    };
    if (!allowed[current].includes(next)) {
      throw new BadRequestException(`Cannot transition from ${current} to ${next}`);
    }
  }

  private generateOrderNumber(): string {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `SP-${ts}${rand}`.substring(0, 12);
  }
}
