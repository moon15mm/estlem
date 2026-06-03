import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  Index,
} from 'typeorm';
import { CommissionType, CommissionStatus } from '@estlem/shared';

@Entity('commission_transactions')
export class CommissionTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Index()
  @Column({ name: 'order_id' })
  orderId: string;

  @Column({ name: 'order_total', type: 'decimal', precision: 10, scale: 2 })
  orderTotal: number;

  @Column({ name: 'commission_type', type: 'enum', enum: CommissionType })
  commissionType: CommissionType;

  @Column({ name: 'commission_rate', type: 'decimal', precision: 10, scale: 2 })
  commissionRate: number;

  @Column({ name: 'commission_amount', type: 'decimal', precision: 10, scale: 2 })
  commissionAmount: number;

  @Column({ type: 'enum', enum: CommissionStatus, default: CommissionStatus.PENDING })
  status: CommissionStatus;

  @Column({ name: 'collected_at', type: 'timestamp', nullable: true })
  collectedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
