import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../database/entities/order.entity';
import { OrderItem } from '../../database/entities/order-item.entity';
import { OrderStatus } from '@estlem/shared';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private itemRepo: Repository<OrderItem>,
  ) {}

  async getDashboard(storeId: string, tenantId: string, from: Date, to: Date) {
    const base = this.orderRepo
      .createQueryBuilder('o')
      .where(
        'o.storeId = :storeId AND o.tenantId = :tenantId AND o.createdAt BETWEEN :from AND :to AND o.status != :cancelled',
        { storeId, tenantId, from, to, cancelled: OrderStatus.CANCELLED },
      );

    const [totalOrders, revenue, avgPrep, topProducts, hourlyBreakdown] =
      await Promise.all([
        base.clone().getCount(),

        base.clone()
          .select('COALESCE(SUM(o.total), 0)', 'total')
          .getRawOne<{ total: string }>(),

        base.clone()
          .select('AVG(EXTRACT(EPOCH FROM (o.deliveredAt - o.createdAt))/60)', 'avgMins')
          .where('o.deliveredAt IS NOT NULL')
          .getRawOne<{ avgMins: string }>(),

        this.itemRepo
          .createQueryBuilder('i')
          .innerJoin('i.order', 'o')
          .where(
            'o.storeId = :storeId AND o.tenantId = :tenantId AND o.createdAt BETWEEN :from AND :to',
            { storeId, tenantId, from, to },
          )
          .select(['i.nameSnapshot AS name', 'SUM(i.quantity) AS qty', 'SUM(i.priceSnapshot * i.quantity) AS revenue'])
          .groupBy('i.nameSnapshot')
          .orderBy('qty', 'DESC')
          .limit(10)
          .getRawMany(),

        base.clone()
          .select(['EXTRACT(HOUR FROM o.createdAt) AS hour', 'COUNT(*) AS orders'])
          .groupBy('hour')
          .orderBy('hour', 'ASC')
          .getRawMany(),
      ]);

    return {
      totalOrders,
      totalRevenue: parseFloat(revenue?.total ?? '0'),
      avgPrepMins: parseFloat(avgPrep?.avgMins ?? '0').toFixed(1),
      topProducts,
      hourlyBreakdown,
    };
  }

  async getDailySales(storeId: string, tenantId: string, days: number) {
    const from = new Date();
    from.setDate(from.getDate() - days);

    return this.orderRepo
      .createQueryBuilder('o')
      .select([
        'DATE(o.createdAt) AS date',
        'COUNT(*) AS orders',
        'SUM(o.total) AS revenue',
      ])
      .where(
        'o.storeId = :storeId AND o.tenantId = :tenantId AND o.createdAt >= :from AND o.status != :cancelled',
        { storeId, tenantId, from, cancelled: OrderStatus.CANCELLED },
      )
      .groupBy('DATE(o.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();
  }
}
