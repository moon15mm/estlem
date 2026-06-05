import {
  Entity, PrimaryColumn, Column, UpdateDateColumn, CreateDateColumn,
} from 'typeorm';
import { ServicePlan } from '@estlem/shared';

/**
 * Stores the *current* monthly price for each ServicePlan. The hard-coded
 * SERVICE_PLAN_PRICE in shared is used as a fallback when no row exists yet.
 */
@Entity('service_plan_settings')
export class ServicePlanSetting {
  @PrimaryColumn({ type: 'varchar', length: 20 })
  plan: ServicePlan;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  monthlyPrice: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
