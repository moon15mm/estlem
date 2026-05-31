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

  @Column({ nullable: true, length: 255 })
  fullName: string;

  @Column({ type: 'enum', enum: Language, default: Language.AR })
  preferredLang: Language;

  @Column({ nullable: true })
  fcmToken: string;

  @OneToMany(() => CustomerVehicle, (v) => v.customer, { cascade: true })
  vehicles: CustomerVehicle[];

  @OneToMany(() => Order, (o) => o.customer)
  orders: Order[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
