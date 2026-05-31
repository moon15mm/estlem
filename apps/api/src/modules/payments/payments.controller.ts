import { Controller, Post, Body, Param } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentMethod } from '@estlem/shared';
import { IsEnum, IsString, IsUUID } from 'class-validator';

class InitiateDto {
  @IsUUID() orderId: string;
  @IsEnum(PaymentMethod) method: PaymentMethod;
  @IsString() returnUrl: string;
}

@Controller('payments')
export class PaymentsController {
  constructor(private service: PaymentsService) {}

  @Post('initiate')
  initiate(@Body() dto: InitiateDto) {
    return this.service.initiatePayment(dto.orderId, dto.method, dto.returnUrl);
  }

  @Post('webhook')
  webhook(@Body() payload: Record<string, unknown>) {
    return this.service.handleWebhook(payload);
  }

  @Post(':id/refund')
  refund(@Param('id') id: string) {
    return this.service.refund(id);
  }
}
