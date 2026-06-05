import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceSubscription } from '../../database/entities/service-subscription.entity';
import { Store } from '../../database/entities/store.entity';
import { TenantAlert } from '../../database/entities/tenant-alert.entity';
import { ServicePlanSetting } from '../../database/entities/service-plan-setting.entity';
import { ServiceSubscriptionsService } from './service-subscriptions.service';
import { ServiceSubscriptionsController } from './service-subscriptions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceSubscription, Store, TenantAlert, ServicePlanSetting])],
  controllers: [ServiceSubscriptionsController],
  providers: [ServiceSubscriptionsService],
  exports: [ServiceSubscriptionsService],
})
export class ServiceSubscriptionsModule {}
