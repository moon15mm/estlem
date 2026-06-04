import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order } from '../../database/entities/order.entity';
import { OrderItem } from '../../database/entities/order-item.entity';
import { Customer } from '../../database/entities/customer.entity';
import { CustomerVehicle } from '../../database/entities/customer-vehicle.entity';
import { ParkingSpot } from '../../database/entities/parking-spot.entity';
import { Product } from '../../database/entities/product.entity';
import { BlockedCustomer } from '../../database/entities/blocked-customer.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { AiCartService } from './ai-cart.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Customer, CustomerVehicle, ParkingSpot, Product, BlockedCustomer]),
    NotificationsModule,
    RealtimeModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, AiCartService],
  exports: [OrdersService],
})
export class OrdersModule {}
