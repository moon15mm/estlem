import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { SubscriptionStatus, BillingCycle } from '@estlem/shared';
import { Tenant } from './tenant.entity';
import { SubscriptionPlan } from './subscription-plan.entity';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'plan_id' })
  planId: string;

  @Column({ type: 'enum', enum: SubscriptionStatus, default: SubscriptionStatus.TRIAL })
  status: SubscriptionStatus;

  @Column({ name: 'billing_cycle', type: 'enum', enum: BillingCycle, default: BillingCycle.MONTHLY })
  billingCycle: BillingCycle;

  @Column({ name: 'current_period_start', type: 'timestamp' })
  currentPeriodStart: Date;

  @Column({ name: 'current_period_end', type: 'timestamp' })
  currentPeriodEnd: Date;

  @Column({ name: 'trial_ends_at', type: 'timestamp', nullable: true })
  trialEndsAt: Date;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt: Date;

  @Column({ name: 'auto_renew', default: true })
  autoRenew: boolean;

  @Column({ name: 'monthly_price', type: 'decimal', precision: 10, scale: 2 })
  monthlyPrice: number;

  @Column({ name: 'yearly_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  yearlyPrice: number;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => SubscriptionPlan)
  @JoinColumn({ name: 'plan_id' })
  plan: SubscriptionPlan;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
