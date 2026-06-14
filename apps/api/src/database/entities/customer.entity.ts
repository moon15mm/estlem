import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToMany, Index,
} from 'typeorm';
import { Language } from '@estlem/shared';
import { CustomerVehicle } from './customer-vehicle.entity';
import { Order } from './order.entity';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ unique: true, length: 20 })
  mobile: string;

  @Index({ unique: true })
  @Column({ unique: true, nullable: true, length: 255 })
  email: string;

  @Column({ nullable: true, length: 255 })
  fullName: string;

  @Column({ nullable: true, select: false })
  passwordHash: string;

  @Column({ nullable: true })
  passwordResetToken: string;

  @Column({ nullable: true, type: 'timestamptz' })
  passwordResetExpiry: Date;

  @Column({ type: 'enum', enum: Language, default: Language.AR })
  preferredLang: Language;

  @Column({ nullable: true })
  fcmToken: string;

  @Column({ nullable: true, length: 255 })
  deviceId: string;

  @Column({ type: 'jsonb', nullable: true })
  deviceInfo: Record<string, unknown>;

  @Column({ default: false })
  isBlocked: boolean;

  @Column({ nullable: true })
  blockedReason: string;

  @Column({ nullable: true })
  lastLoginAt: Date;

  @OneToMany(() => CustomerVehicle, (v) => v.customer, { cascade: true })
  vehicles: CustomerVehicle[];

  @OneToMany(() => Order, (o) => o.customer)
  orders: Order[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
