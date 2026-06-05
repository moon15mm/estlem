import {
  Controller, Get, Post, Patch, Param, Body, UseGuards, Request, Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ServicePlan, SystemRole } from '@estlem/shared';
import { ServiceSubscriptionsService } from './service-subscriptions.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Service Subscriptions')
@ApiBearerAuth()
@Controller('service-subscriptions')
export class ServiceSubscriptionsController {
  constructor(private service: ServiceSubscriptionsService) {}

  // ── Tenant-facing (store owner) endpoints ────────────────────────────

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getMine(@Request() req: { user: { tenantId: string } }) {
    const sub = await this.service.getCurrent(req.user.tenantId);
    return { subscription: sub };
  }

  @Post('me/subscribe')
  @UseGuards(AuthGuard('jwt'))
  async subscribeMine(
    @Request() req: { user: { tenantId: string } },
    @Body() body: { plan: ServicePlan; months?: number },
  ) {
    return this.service.subscribe(req.user.tenantId, body.plan, body.months ?? 1);
  }

  @Post('me/cancel')
  @UseGuards(AuthGuard('jwt'))
  async cancelMine(@Request() req: { user: { tenantId: string } }) {
    return this.service.cancel(req.user.tenantId);
  }

  // ── Admin endpoints (super-admin only) ────────────────────────────────

  @Get('admin/list')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN)
  async listAll() {
    return this.service.listAll();
  }

  @Post('admin/:tenantId/set-plan')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN)
  async adminSetPlan(
    @Param('tenantId') tenantId: string,
    @Body() body: { plan: ServicePlan; months?: number },
  ) {
    return this.service.setPlan(tenantId, body.plan, body.months ?? 1);
  }

  @Post('admin/:tenantId/cancel')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN)
  async adminCancel(@Param('tenantId') tenantId: string) {
    return this.service.cancel(tenantId);
  }

  @Post('admin/run-sweep')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN)
  async runSweep() {
    // Allow admin to trigger the daily check on-demand
    return this.service.dailySweep();
  }
}
