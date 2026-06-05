import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  Index,
} from 'typeorm';
import { ServicePlan, SubscriptionStatus } from '@estlem/shared';

@Entity('service_subscriptions')
export class ServiceSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  tenantId: string;

  @Column({ type: 'varchar', length: 20 })
  plan: ServicePlan;

  @Column({ type: 'varchar', length: 20, default: SubscriptionStatus.ACTIVE })
  status: SubscriptionStatus;

  @Column({ type: 'timestamp' })
  startedAt: Date;

  /** Subscription end date — after this we enter the grace period. */
  @Column({ type: 'timestamp' })
  expiresAt: Date;

  /** End of the grace period — after this the subscription is fully expired. */
  @Column({ type: 'timestamp', nullable: true })
  graceEndsAt: Date | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  monthlyPrice: number;

  @Column({ default: true })
  autoRenew: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastPaymentAt: Date | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  lastPaymentAmount: number | null;

  /** When the most recent warning email/notification was sent (so we don't spam). */
  @Column({ type: 'timestamp', nullable: true })
  lastWarningAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
