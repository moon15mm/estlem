import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommissionsService } from './commissions.service';
import { CommissionsController } from './commissions.controller';
import { CommissionRule } from '../../database/entities/commission-rule.entity';
import { CommissionTransaction } from '../../database/entities/commission-transaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CommissionRule, CommissionTransaction])],
  controllers: [CommissionsController],
  providers: [CommissionsService],
  exports: [CommissionsService],
})
export class CommissionsModule {}
