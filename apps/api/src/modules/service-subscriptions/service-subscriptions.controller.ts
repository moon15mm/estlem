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

  /**
   * Start a payment session for the chosen plan. Returns a paymentUrl the
   * front-end should redirect to (Moyasar invoice, or our test-mode auto-confirm).
   */
  @Post('me/initiate-payment')
  @UseGuards(AuthGuard('jwt'))
  async initiatePayment(
    @Request() req: { user: { tenantId: string }; headers: Record<string, string> },
    @Body() body: { plan: ServicePlan; months?: number; frontendUrl?: string },
  ) {
    const frontendUrl =
      body.frontendUrl ||
      req.headers['origin'] ||
      'https://dashboard.estlem.store';
    return this.service.initiatePayment(
      req.user.tenantId,
      body.plan,
      body.months ?? 1,
      frontendUrl,
    );
  }

  /**
   * Called by the front-end after Moyasar redirects the user back.
   * Public endpoint — uses the signed token from initiatePayment.
   */
  @Post('payment-callback')
  async paymentCallback(
    @Body() body: {
      token: string;
      plan: ServicePlan;
      months: number;
      amount: number;
      status: string;
    },
  ) {
    // token format: sub_<tenantId>_<plan>_<months>_<ts>
    const parts = (body.token || '').split('_');
    if (parts.length < 4 || parts[0] !== 'sub') return { ok: false, reason: 'Invalid token' };
    const tenantId = parts[1];
    return this.service.confirmPayment(
      tenantId,
      body.plan,
      body.months,
      body.amount,
      body.status,
    );
  }

  // ── Alerts (in-app notifications) ─────────────────────────────────────

  @Get('me/alerts')
  @UseGuards(AuthGuard('jwt'))
  async myAlerts(
    @Request() req: { user: { tenantId: string } },
    @Query('unread') unread?: string,
  ) {
    const alerts = await this.service.listAlerts(req.user.tenantId, unread === 'true');
    return {
      alerts,
      unreadCount: alerts.filter((a) => !a.isRead).length,
    };
  }

  @Post('me/alerts/:id/read')
  @UseGuards(AuthGuard('jwt'))
  async readAlert(
    @Request() req: { user: { tenantId: string } },
    @Param('id') id: string,
  ) {
    await this.service.markAlertRead(req.user.tenantId, id);
    return { ok: true };
  }

  @Post('me/alerts/read-all')
  @UseGuards(AuthGuard('jwt'))
  async readAllAlerts(@Request() req: { user: { tenantId: string } }) {
    await this.service.markAllAlertsRead(req.user.tenantId);
    return { ok: true };
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
