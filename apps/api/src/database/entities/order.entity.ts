import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  OneToMany, JoinColumn, Index, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { OrderStatus, OrderType, PaymentMethod, PaymentStatus } from '@estlem/shared';
import { Store } from './store.entity';
import { Customer } from './customer.entity';
import { CustomerVehicle } from './customer-vehicle.entity';
import { ParkingSpot } from './parking-spot.entity';
import { OrderItem } from './order-item.entity';
import { Payment } from './payment.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  tenantId: string;

  @Index()
  @Column()
  storeId: string;

  @ManyToOne(() => Store, (s) => s.orders)
  @JoinColumn({ name: 'storeId' })
  store: Store;

  @Index()
  @Column()
  customerId: string;

  @ManyToOne(() => Customer, (c) => c.orders)
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @Column({ nullable: true })
  vehicleId: string;

  @ManyToOne(() => CustomerVehicle, { nullable: true })
  @JoinColumn({ name: 'vehicleId' })
  vehicle: CustomerVehicle;

  @Column({ nullable: true })
  parkingSpotId: string;

  @ManyToOne(() => ParkingSpot, { nullable: true })
  @JoinColumn({ name: 'parkingSpotId' })
  parkingSpot: ParkingSpot;

  @Index({ unique: true })
  @Column({ unique: true, length: 20 })
  orderNumber: string;

  @Column({ type: 'enum', enum: OrderType, default: OrderType.CATALOG })
  type: OrderType;

  @Column({ type: 'varchar', length: 30, default: OrderStatus.NEW })
  status: OrderStatus;

  @Column({ type: 'enum', enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  paymentStatus: PaymentStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tax: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'text', nullable: true })
  rawRequest: string;

  @Column({ type: 'jsonb', nullable: true })
  aiParsed: unknown;

  @Column({ nullable: true })
  estimatedMins: number;

  @Column({ nullable: true })
  assignedStaffId: string;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @OneToMany(() => Payment, (p) => p.order)
  payments: Payment[];

  @Column({ nullable: true })
  deliveredAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
