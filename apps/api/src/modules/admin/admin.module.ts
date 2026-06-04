import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { Tenant } from '../../database/entities/tenant.entity';
import { Subscription } from '../../database/entities/subscription.entity';
import { SubscriptionPlan } from '../../database/entities/subscription-plan.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, Subscription, SubscriptionPlan])],
  controllers: [AdminController],
})
export class AdminModule {}
