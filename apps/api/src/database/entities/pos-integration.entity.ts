import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { PosProvider } from '@estlem/shared';
import { Tenant } from './tenant.entity';
import { Store } from './store.entity';

@Entity('pos_integrations')
export class PosIntegration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column()
  storeId: string;

  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storeId' })
  store: Store;

  @Column({ type: 'enum', enum: PosProvider })
  provider: PosProvider;

  @Column({ type: 'jsonb', default: {} })
  credentials: Record<string, unknown>;

  @Column({ default: 'manual' })
  syncMode: 'manual' | 'webhook' | 'polling';

  @Column({ nullable: true })
  lastSyncAt: Date;

  @Column({ default: 'active' })
  status: 'active' | 'error' | 'paused';

  @Column({ nullable: true, type: 'text' })
  lastError: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
