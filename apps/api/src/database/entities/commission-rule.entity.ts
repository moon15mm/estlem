import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  Index,
} from 'typeorm';
import { CommissionType } from '@estlem/shared';

@Entity('commission_rules')
export class CommissionRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'tenant_id', nullable: true })
  tenantId: string;

  @Column({ name: 'is_global', default: false })
  isGlobal: boolean;

  @Column({ type: 'enum', enum: CommissionType, default: CommissionType.PERCENTAGE })
  type: CommissionType;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  value: number;

  @Column({ name: 'min_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  minAmount: number;

  @Column({ name: 'max_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxAmount: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ length: 500, nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
