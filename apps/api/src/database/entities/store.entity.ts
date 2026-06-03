import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index,
} from 'typeorm';
import { StoreCategory, ServiceMode } from '@estlem/shared';
import { Tenant } from './tenant.entity';
import { ParkingSpot } from './parking-spot.entity';
import { Product } from './product.entity';
import { Order } from './order.entity';
import { Staff } from './staff.entity';

@Entity('stores')
export class Store {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  tenantId: string;

  @ManyToOne(() => Tenant, (tenant) => tenant.stores, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 255 })
  nameAr: string;

  @Column({ type: 'enum', enum: StoreCategory, default: StoreCategory.OTHER })
  category: StoreCategory;

  @Column({ nullable: true })
  address: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lng: number;

  @Column({ default: 200 })
  geofenceRadius: number;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ nullable: true })
  coverUrl: string;

  @Column({ type: 'jsonb', default: {} })
  operatingHours: Record<string, unknown>;

  @Column({ type: 'varchar', length: 20, default: 'drive_through' })
  serviceMode: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  phoneNumber: string;

  @OneToMany(() => ParkingSpot, (spot) => spot.store, { cascade: true })
  parkingSpots: ParkingSpot[];

  @OneToMany(() => Product, (product) => product.store, { cascade: true })
  products: Product[];

  @OneToMany(() => Order, (order) => order.store)
  orders: Order[];

  @OneToMany(() => Staff, (staff) => staff.store)
  staff: Staff[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
