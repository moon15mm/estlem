import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  JoinColumn, Index, CreateDateColumn,
} from 'typeorm';
import { SpotType } from '@estlem/shared';
import { Store } from './store.entity';

@Entity('parking_spots')
export class ParkingSpot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  storeId: string;

  @ManyToOne(() => Store, (store) => store.parkingSpots, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storeId' })
  store: Store;

  @Column({ type: 'enum', enum: SpotType, default: SpotType.PARKING })
  type: SpotType;

  @Column({ length: 20 })
  spotNumber: string;

  @Index({ unique: true })
  @Column({ unique: true })
  qrCode: string;

  @Column({ nullable: true })
  nfcTagId: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
