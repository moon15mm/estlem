import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, OneToMany, JoinColumn, Index, Unique,
} from 'typeorm';
import { MembershipTier } from '@estlem/shared';
import { Customer } from './customer.entity';
import { LoyaltyTransaction } from './loyalty-transaction.entity';

@Entity('loyalty_accounts')
@Unique(['customerId', 'tenantId'])
export class LoyaltyAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'customer_id' })
  customerId: string;

  @Index()
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'total_points', type: 'int', default: 0 })
  totalPoints: number;

  @Column({ name: 'available_points', type: 'int', default: 0 })
  availablePoints: number;

  @Column({ name: 'redeemed_points', type: 'int', default: 0 })
  redeemedPoints: number;

  @Column({ type: 'enum', enum: MembershipTier, default: MembershipTier.BRONZE })
  tier: MembershipTier;

  @Column({ name: 'total_spent', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalSpent: number;

  @Column({ name: 'total_visits', type: 'int', default: 0 })
  totalVisits: number;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @OneToMany(() => LoyaltyTransaction, (tx) => tx.account)
  transactions: LoyaltyTransaction[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
