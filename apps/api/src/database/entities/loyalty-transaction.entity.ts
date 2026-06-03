import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { LoyaltyTransactionType } from '@estlem/shared';
import { LoyaltyAccount } from './loyalty-account.entity';

@Entity('loyalty_transactions')
export class LoyaltyTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'account_id' })
  accountId: string;

  @Index()
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'order_id', nullable: true })
  orderId: string;

  @Column({ type: 'enum', enum: LoyaltyTransactionType })
  type: LoyaltyTransactionType;

  @Column({ type: 'int' })
  points: number;

  @Column({ name: 'balance_after', type: 'int' })
  balanceAfter: number;

  @Column({ length: 500, nullable: true })
  description: string;

  @ManyToOne(() => LoyaltyAccount, (account) => account.transactions)
  @JoinColumn({ name: 'account_id' })
  account: LoyaltyAccount;

  @CreateDateColumn()
  createdAt: Date;
}
