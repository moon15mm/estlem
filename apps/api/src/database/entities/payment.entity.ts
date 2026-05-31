import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { PaymentMethod, PaymentStatus } from '@estlem/shared';
import { Order } from './order.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderId: string;

  @ManyToOne(() => Order, (o) => o.payments)
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ nullable: true })
  gatewayRef: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ length: 3, default: 'SAR' })
  currency: string;

  @Column({ type: 'enum', enum: PaymentMethod })
  method: PaymentMethod;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @Column({ nullable: true })
  capturedAt: Date;

  @Column({ nullable: true })
  refundedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
