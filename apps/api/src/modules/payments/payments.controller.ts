import {
  Controller, Post, Body, Param, UseGuards, Headers,
  ForbiddenException, Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { PaymentMethod, StaffRole } from '@estlem/shared';
import { IsEnum, IsString, IsUUID } from 'class-validator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

class InitiateDto {
  @IsUUID() orderId: string;
  @IsEnum(PaymentMethod) method: PaymentMethod;
  @IsString() returnUrl: string;
}

@Controller('payments')
export class PaymentsController {
  constructor(
    private service: PaymentsService,
    private config: ConfigService,
  ) {}

  @Post('initiate')
  @UseGuards(AuthGuard('jwt'))
  initiate(@Body() dto: InitiateDto) {
    return this.service.initiatePayment(dto.orderId, dto.method, dto.returnUrl);
  }

  @Post('test-confirm/:sessionId')
  testConfirm(@Param('sessionId') sessionId: string) {
    return this.service.confirmTestPayment(sessionId);
  }

  @Post('webhook')
  webhook(
    @Body() payload: Record<string, unknown>,
    @Headers('authorization') signature: string,
  ) {
    // Moyasar webhooks: signature usually in 'authorization' header or 'X-Moyasar-Signature'
    const secret = this.config.get<string>('MOYASAR_WEBHOOK_SECRET') || this.config.get<string>('CHECKOUT_WEBHOOK_SECRET');
    if (secret && signature !== secret && signature !== `Bearer ${secret}`) {
      throw new ForbiddenException('Invalid webhook signature');
    }
    return this.service.handleWebhook(payload);
  }

  @Post(':id/refund')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(StaffRole.OWNER, StaffRole.MANAGER)
  refund(@Param('id') id: string) {
    return this.service.refund(id);
  }
}
