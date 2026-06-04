import { Controller, Get, Post, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CommissionsService } from './commissions.service';
import { CommissionType } from '@estlem/shared';

@ApiTags('Commissions')
@ApiBearerAuth()
@Controller('commissions')
export class CommissionsController {
  constructor(private readonly service: CommissionsService) {}

  // ── Admin endpoints ──

  @Get('global-rule')
  @ApiOperation({ summary: 'Get global commission rule (admin)' })
  getGlobalRule() {
    return this.service.getGlobalRule();
  }

  @Post('global-rule')
  @ApiOperation({ summary: 'Set global commission rule (admin)' })
  setGlobalRule(@Body() body: { type: CommissionType; value: number; minAmount?: number; maxAmount?: number }) {
    return this.service.setGlobalRule(body.type, body.value, body.minAmount, body.maxAmount);
  }

  @Post('tenant-rule/:tenantId')
  @ApiOperation({ summary: 'Set tenant-specific commission rule (admin)' })
  setTenantRule(@Param('tenantId') tenantId: string, @Body() body: { type: CommissionType; value: number }) {
    return this.service.setTenantRule(tenantId, body.type, body.value);
  }

  @Delete('tenant-rule/:tenantId')
  @ApiOperation({ summary: 'Remove tenant-specific rule, fall back to global (admin)' })
  removeTenantRule(@Param('tenantId') tenantId: string) {
    return this.service.removeTenantRule(tenantId);
  }

  @Get('report')
  @ApiOperation({ summary: 'Get commission report (admin)' })
  getReport(
    @Query('tenantId') tenantId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.getReport({ tenantId, page, limit });
  }

  @Post('collect')
  @ApiOperation({ summary: 'Mark commissions as collected (admin)' })
  markCollected(@Body() body: { ids: string[] }) {
    return this.service.markCollected(body.ids);
  }

  // ── Merchant endpoint ──

  @Get('my-commissions')
  @ApiOperation({ summary: 'Get my commissions (merchant)' })
  getMyCommissions(@Req() req: any, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.service.getReport({ tenantId: req.user.tenantId, page, limit });
  }
}
