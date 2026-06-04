import {
  Controller, Post, Get, Body, Param, UseGuards, Headers, Query,
  ForbiddenException, Request, Res,
} from '@nestjs/common';
import type { Response } from 'express';
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

  // Get publishable key + amount for inline Moyasar form
  @Get('checkout-info/:orderId')
  checkoutInfo(@Param('orderId') orderId: string) {
    return this.service.getCheckoutInfo(orderId);
  }

  // Moyasar redirects here after payment with ?id=...&status=...&token=orderId
  @Get('moyasar/callback')
  async moyasarCallback(
    @Query('id') paymentId: string,
    @Query('status') status: string,
    @Query('token') orderId: string,
    @Res() res: Response,
  ) {
    const result = await this.service.handleMoyasarCallback(orderId, paymentId, status);
    const baseUrl = process.env.FRONTEND_URL || 'https://estlem.store';
    if (result.success) {
      res.redirect(`${baseUrl}/order/${orderId}?payment=success`);
    } else {
      res.redirect(`${baseUrl}/order/${orderId}?payment=failed&reason=${encodeURIComponent(result.reason || '')}`);
    }
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
