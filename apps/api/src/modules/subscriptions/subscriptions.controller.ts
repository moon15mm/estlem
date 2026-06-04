import { Controller, Get, Post, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { BillingCycle, TenantPlan } from '@estlem/shared';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly service: SubscriptionsService) {}

  @Get('plans')
  @ApiOperation({ summary: 'Get available subscription plans' })
  getPlans() {
    return this.service.getPlans();
  }

  @ApiBearerAuth()
  @Get('my')
  @ApiOperation({ summary: 'Get current tenant subscription' })
  getMySubscription(@Req() req: any) {
    return this.service.getMySubscription(req.user.tenantId);
  }

  @ApiBearerAuth()
  @Post('subscribe')
  @ApiOperation({ summary: 'Subscribe to a plan' })
  subscribe(@Req() req: any, @Body() body: { planTier: TenantPlan; billingCycle: BillingCycle }) {
    return this.service.subscribe(req.user.tenantId, body.planTier, body.billingCycle);
  }

  @ApiBearerAuth()
  @Post('upgrade')
  @ApiOperation({ summary: 'Upgrade subscription plan' })
  upgrade(@Req() req: any, @Body() body: { planTier: TenantPlan }) {
    return this.service.upgrade(req.user.tenantId, body.planTier);
  }

  @ApiBearerAuth()
  @Post('cancel')
  @ApiOperation({ summary: 'Cancel subscription' })
  cancel(@Req() req: any) {
    return this.service.cancel(req.user.tenantId);
  }

  @ApiBearerAuth()
  @Get('invoices')
  @ApiOperation({ summary: 'Get tenant invoices' })
  getInvoices(@Req() req: any, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.service.getInvoices(req.user.tenantId, page, limit);
  }
}
