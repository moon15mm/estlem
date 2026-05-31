import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  JoinColumn, Index, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { StaffRole } from '@estlem/shared';
import { Tenant } from './tenant.entity';
import { Store } from './store.entity';

@Entity('staff')
export class Staff {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  tenantId: string;

  @ManyToOne(() => Tenant, (t) => t.staff, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Index()
  @Column()
  storeId: string;

  @ManyToOne(() => Store, (s) => s.staff)
  @JoinColumn({ name: 'storeId' })
  store: Store;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 20 })
  mobile: string;

  @Column({ type: 'enum', enum: StaffRole, default: StaffRole.STAFF })
  role: StaffRole;

  @Column({ nullable: true })
  pinHash: string;

  @Column({ nullable: true })
  passwordHash: string;

  @Column({ nullable: true })
  fcmToken: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
