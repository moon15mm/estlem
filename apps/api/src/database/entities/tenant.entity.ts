import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToMany,
} from 'typeorm';
import { TenantPlan, TenantStatus } from '@estlem/shared';
import { Store } from './store.entity';
import { Staff } from './staff.entity';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 100, unique: true })
  slug: string;

  @Column({ type: 'enum', enum: TenantPlan, default: TenantPlan.STARTER })
  plan: TenantPlan;

  @Column({ type: 'enum', enum: TenantStatus, default: TenantStatus.TRIAL })
  status: TenantStatus;

  @Column({ type: 'jsonb', default: {} })
  settings: Record<string, unknown>;

  @Column({ nullable: true })
  trialEndsAt: Date;

  @Column({ nullable: true })
  billingEmail: string;

  @OneToMany(() => Store, (store) => store.tenant)
  stores: Store[];

  @OneToMany(() => Staff, (staff) => staff.tenant)
  staff: Staff[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
