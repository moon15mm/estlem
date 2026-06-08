import {
  Controller, Post, Get, Body, Param, UseGuards, Headers, Query,
  ForbiddenException, Request, Res, RawBodyRequest,
} from '@nestjs/common';
import type { Response, Request as ExpressRequest } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
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
  @UseGuards(AuthGuard('jwt'))
  testConfirm(@Param('sessionId') sessionId: string) {
    // Allow test-confirm for test-mode payments even in production
    // (when no Moyasar key is configured, the system falls back to test mode)
    // The confirmTestPayment method verifies the payment metadata is actually test mode
    return this.service.confirmTestPayment(sessionId);
  }

  // Get publishable key + amount for inline Moyasar form
  @Get('checkout-info/:orderId')
  @UseGuards(AuthGuard('jwt'))
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
    @Headers('authorization') authHeader: string,
    @Headers('x-moyasar-signature') moyasarSig: string,
  ) {
    const secret = this.config.get<string>('MOYASAR_WEBHOOK_SECRET') || this.config.get<string>('CHECKOUT_WEBHOOK_SECRET');

    if (!secret) {
      throw new ForbiddenException('Webhook secret not configured');
    }

    // Verify signature using timing-safe comparison
    const signature = moyasarSig || authHeader;
    if (!signature) {
      throw new ForbiddenException('Missing webhook signature');
    }

    // Try HMAC verification first, then fall back to token comparison
    const payloadStr = JSON.stringify(payload);
    const expectedHmac = createHmac('sha256', secret).update(payloadStr).digest('hex');

    const sigToCompare = signature.replace('Bearer ', '');
    let isValid = false;
    try {
      isValid = timingSafeEqual(
        Buffer.from(sigToCompare),
        Buffer.from(expectedHmac),
      );
    } catch {
      // Length mismatch — try direct token comparison with timing-safe
      try {
        isValid = timingSafeEqual(
          Buffer.from(sigToCompare),
          Buffer.from(secret),
        );
      } catch {
        isValid = false;
      }
    }

    if (!isValid) {
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
