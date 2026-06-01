import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Tenant } from '../../database/entities/tenant.entity';
import { Store } from '../../database/entities/store.entity';
import { Staff } from '../../database/entities/staff.entity';
import { Order } from '../../database/entities/order.entity';
import { OrderStatus, TenantPlan, TenantStatus, StaffRole, StoreCategory } from '@estlem/shared';
import { RegisterTenantDto } from './dto/register-tenant.dto';

export { RegisterTenantDto };

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant) private repo: Repository<Tenant>,
    @InjectRepository(Store) private storeRepo: Repository<Store>,
    @InjectRepository(Staff) private staffRepo: Repository<Staff>,
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterTenantDto): Promise<any> {
    const existing = await this.repo.findOne({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('Slug already taken');

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    const tenant = await this.repo.save(
      this.repo.create({
        name: dto.name,
        slug: dto.slug,
        billingEmail: dto.billingEmail,
        plan: dto.plan ?? TenantPlan.STARTER,
        status: TenantStatus.TRIAL,
        trialEndsAt,
      }),
    );

    // If owner details provided, bootstrap first store + owner staff + token
    if (dto.ownerMobile && dto.ownerPin) {
      const store = await this.storeRepo.save(
        this.storeRepo.create({
          tenantId: tenant.id,
          name: dto.storeName ?? dto.name,
          nameAr: dto.storeNameAr ?? dto.name,
          category: dto.storeCategory ?? StoreCategory.GROCERY,
          isActive: true,
          operatingHours: {},
        }),
      );

      const owner = await this.staffRepo.save(
        this.staffRepo.create({
          tenantId: tenant.id,
          storeId: store.id,
          name: dto.ownerName ?? 'Owner',
          mobile: dto.ownerMobile,
          role: StaffRole.OWNER,
          pinHash: await bcrypt.hash(dto.ownerPin, 10),
          isActive: true,
        }),
      );

      const payload = {
        sub: owner.id,
        type: 'staff',
        tenantId: tenant.id,
        storeId: store.id,
        role: StaffRole.OWNER,
      };
      const accessToken = this.jwt.sign(payload);

      return { tenant, store, owner: { id: owner.id, name: owner.name, role: owner.role }, accessToken };
    }

    return tenant;
  }

  async findById(id: string): Promise<Tenant> {
    const tenant = await this.repo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async updateSettings(id: string, settings: Record<string, unknown>): Promise<Tenant> {
    const tenant = await this.findById(id);
    tenant.settings = { ...tenant.settings, ...settings };
    return this.repo.save(tenant);
  }

  async listAll(): Promise<Tenant[]> {
    return this.repo.find({
      relations: ['stores', 'staff'],
      order: { createdAt: 'DESC' },
    });
  }

  async getAdminStats(): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      tenantsCount,
      storesCount,
      activeStoresCount,
      inactiveStoresCount,
      ordersCount,
      ordersToday,
      deliveredOrders,
      cancelledOrders,
      activeOrders,
    ] = await Promise.all([
      this.repo.count(),
      this.storeRepo.count(),
      this.storeRepo.count({ where: { isActive: true } }),
      this.storeRepo.count({ where: { isActive: false } }),
      this.orderRepo.count(),
      this.orderRepo
        .createQueryBuilder('order')
        .where('order.createdAt >= :today', { today })
        .getCount(),
      this.orderRepo.count({ where: { status: OrderStatus.DELIVERED } }),
      this.orderRepo.count({ where: { status: OrderStatus.CANCELLED } }),
      this.orderRepo
        .createQueryBuilder('order')
        .where('order.status IN (:...statuses)', {
          statuses: [
            OrderStatus.NEW,
            OrderStatus.ACCEPTED,
            OrderStatus.PREPARING,
            OrderStatus.READY,
          ],
        })
        .getCount(),
    ]);
    
    const revenueResult = await this.orderRepo
      .createQueryBuilder('order')
      .select('SUM(order.total)', 'total')
      .where('order.status = :status', { status: OrderStatus.DELIVERED })
      .getRawOne();
    
    const totalRevenue = parseFloat(revenueResult?.total ?? '0');

    const revenueTodayResult = await this.orderRepo
      .createQueryBuilder('order')
      .select('SUM(order.total)', 'total')
      .where('order.status = :status', { status: OrderStatus.DELIVERED })
      .andWhere('order.createdAt >= :today', { today })
      .getRawOne();

    const revenueToday = parseFloat(revenueTodayResult?.total ?? '0');

    const statusResult = await this.repo
      .createQueryBuilder('t')
      .select('t.status, COUNT(t.id)', 'count')
      .groupBy('t.status')
      .getRawMany();
    const statusDistribution = statusResult.reduce((acc, r) => {
      acc[r.status] = parseInt(r.count, 10);
      return acc;
    }, {} as Record<string, number>);

    const planResult = await this.repo
      .createQueryBuilder('t')
      .select('t.plan, COUNT(t.id)', 'count')
      .groupBy('t.plan')
      .getRawMany();
    const planDistribution = planResult.reduce((acc, r) => {
      acc[r.plan] = parseInt(r.count, 10);
      return acc;
    }, {} as Record<string, number>);

    const orderStatusResult = await this.orderRepo
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(order.id)', 'count')
      .groupBy('order.status')
      .getRawMany();

    const orderStatusDistribution = orderStatusResult.reduce((acc, r) => {
      acc[r.status] = parseInt(r.count, 10);
      return acc;
    }, {} as Record<string, number>);

    const storesWithOrdersResult = await this.orderRepo
      .createQueryBuilder('order')
      .select('COUNT(DISTINCT order.storeId)', 'count')
      .getRawOne();

    const storesWithOrdersCount = parseInt(storesWithOrdersResult?.count ?? '0', 10);

    const topStores = await this.storeRepo
      .createQueryBuilder('store')
      .leftJoin('store.orders', 'order')
      .select('store.id', 'id')
      .addSelect('store.name', 'name')
      .addSelect('store.nameAr', 'nameAr')
      .addSelect('store.isActive', 'isActive')
      .addSelect('COUNT(order.id)', 'orders')
      .addSelect(
        'COALESCE(SUM(CASE WHEN order.status = :delivered THEN order.total ELSE 0 END), 0)',
        'revenue',
      )
      .setParameter('delivered', OrderStatus.DELIVERED)
      .groupBy('store.id')
      .orderBy('COUNT(order.id)', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      tenantsCount,
      storesCount,
      activeStoresCount,
      inactiveStoresCount,
      storesWithOrdersCount,
      ordersCount,
      ordersToday,
      deliveredOrders,
      cancelledOrders,
      activeOrders,
      totalRevenue,
      revenueToday,
      statusDistribution,
      planDistribution,
      orderStatusDistribution,
      topStores: topStores.map((store) => ({
        id: store.id,
        name: store.name,
        nameAr: store.nameAr,
        isActive: store.isActive,
        orders: parseInt(store.orders ?? '0', 10),
        revenue: parseFloat(store.revenue ?? '0'),
      })),
    };
  }

  async adminUpdate(id: string, plan?: TenantPlan, status?: TenantStatus): Promise<Tenant> {
    const tenant = await this.findById(id);
    if (plan) tenant.plan = plan;
    if (status) tenant.status = status;
    return this.repo.save(tenant);
  }
}
