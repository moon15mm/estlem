import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  Index, Unique,
} from 'typeorm';

@Entity('blocked_customers')
@Unique(['tenantId', 'customerId'])
export class BlockedCustomer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  tenantId: string;

  @Index()
  @Column()
  customerId: string;

  @Column({ length: 20 })
  mobile: string;

  @Column({ nullable: true, length: 255 })
  reason: string;

  @Column({ nullable: true })
  blockedBy: string;  // staffId

  @CreateDateColumn()
  createdAt: Date;
}
