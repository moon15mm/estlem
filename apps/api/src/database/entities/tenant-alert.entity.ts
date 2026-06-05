import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

/**
 * Lightweight in-app notification for store owners.
 * Used today for subscription warnings; designed to be extensible (type column).
 */
@Entity('tenant_alerts')
export class TenantAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  tenantId: string;

  /** e.g. 'subscription_warning' | 'subscription_grace' | 'subscription_expired' */
  @Column({ length: 60 })
  type: string;

  @Column({ length: 200 })
  title: string;

  @Column({ length: 600 })
  message: string;

  /** Optional path the user should be sent to when clicking the alert. */
  @Column({ length: 200, nullable: true })
  actionUrl: string | null;

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
