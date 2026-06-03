import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { TenantPlan } from '@estlem/shared';

@Entity('subscription_plans')
export class SubscriptionPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ name: 'name_ar', length: 100, nullable: true })
  nameAr: string;

  @Column({ type: 'enum', enum: TenantPlan, unique: true })
  tier: TenantPlan;

  @Column({ length: 500, nullable: true })
  description: string;

  @Column({ name: 'description_ar', length: 500, nullable: true })
  descriptionAr: string;

  @Column({ name: 'monthly_price', type: 'decimal', precision: 10, scale: 2 })
  monthlyPrice: number;

  @Column({ name: 'yearly_price', type: 'decimal', precision: 10, scale: 2 })
  yearlyPrice: number;

  @Column({ name: 'max_orders_per_month', type: 'int' })
  maxOrdersPerMonth: number;

  @Column({ name: 'max_employees', type: 'int' })
  maxEmployees: number;

  @Column({ name: 'max_branches', type: 'int' })
  maxBranches: number;

  @Column({ name: 'max_products', type: 'int' })
  maxProducts: number;

  @Column({ name: 'has_analytics', default: false })
  hasAnalytics: boolean;

  @Column({ name: 'has_loyalty', default: false })
  hasLoyalty: boolean;

  @Column({ name: 'has_api_access', default: false })
  hasApiAccess: boolean;

  @Column({ name: 'has_custom_branding', default: false })
  hasCustomBranding: boolean;

  @Column({ name: 'has_priority_support', default: false })
  hasPrioritySupport: boolean;

  @Column({ name: 'has_export', default: false })
  hasExport: boolean;

  @Column({ name: 'trial_days', type: 'int', default: 14 })
  trialDays: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'jsonb', nullable: true })
  features: { name: string; nameAr: string; included: boolean }[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
