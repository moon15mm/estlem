import { Controller, Get, Post, Body, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LoyaltyService } from './loyalty.service';

@ApiTags('Loyalty')
@ApiBearerAuth()
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly service: LoyaltyService) {}

  @Get('my-account')
  @ApiOperation({ summary: 'Get customer loyalty account' })
  getMyAccount(@Req() req: any, @Query('tenantId') tenantId: string) {
    return this.service.getCustomerAccount(req.user.sub, tenantId);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get loyalty transactions' })
  getTransactions(
    @Req() req: any,
    @Query('tenantId') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.getTransactions(req.user.sub, tenantId, page, limit);
  }

  @Post('redeem')
  @ApiOperation({ summary: 'Redeem loyalty points' })
  redeem(@Req() req: any, @Body() body: { tenantId: string; points: number }) {
    return this.service.redeemPoints(req.user.sub, body.tenantId, body.points);
  }

  @Get('tiers')
  @ApiOperation({ summary: 'Get tier thresholds' })
  getTierThresholds() {
    return this.service.getTierThresholds();
  }

  // Merchant endpoints
  @Get('members')
  @ApiOperation({ summary: 'Get tenant loyalty members (merchant)' })
  getMembers(@Req() req: any, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.service.getTenantMembers(req.user.tenantId, page, limit);
  }

  @Post('bonus')
  @ApiOperation({ summary: 'Add bonus points to customer (merchant)' })
  addBonus(@Req() req: any, @Body() body: { customerId: string; points: number; description: string }) {
    return this.service.addBonusPoints(body.customerId, req.user.tenantId, body.points, body.description);
  }
}
