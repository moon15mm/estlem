import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  Index,
} from 'typeorm';
import { InvoiceStatus } from '@estlem/shared';

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'subscription_id' })
  subscriptionId: string;

  @Index({ unique: true })
  @Column({ name: 'invoice_number', length: 50 })
  invoiceNumber: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tax: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.DRAFT })
  status: InvoiceStatus;

  @Column({ name: 'due_date', type: 'date' })
  dueDate: Date;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt: Date;

  @Column({ name: 'billing_period_start', type: 'date' })
  billingPeriodStart: Date;

  @Column({ name: 'billing_period_end', type: 'date' })
  billingPeriodEnd: Date;

  @Column({ type: 'jsonb', nullable: true })
  items: { description: string; quantity: number; unitPrice: number; total: number }[];

  @Column({ name: 'pdf_url', length: 500, nullable: true })
  pdfUrl: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
