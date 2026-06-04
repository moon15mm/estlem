import { Controller, Get, Patch, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Tenant } from '../../database/entities/tenant.entity';
import { Subscription } from '../../database/entities/subscription.entity';
import { TenantStatus, TenantPlan, SystemRole } from '@estlem/shared';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(SystemRole.SUPER_ADMIN)
export class AdminController {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepo: Repository<Tenant>,
    @InjectRepository(Subscription)
    private subRepo: Repository<Subscription>,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  @Get('tenants')
  @ApiOperation({ summary: 'List all tenants (admin)' })
  async getTenants(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
  ) {
    const where: any = {};
    if (status) where.status = status;

    const [tenants, total] = await this.tenantRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      relations: ['stores', 'staff'],
    });

    return { tenants, total, page: Number(page), limit: Number(limit) };
  }

  @Get('tenants/:id')
  @ApiOperation({ summary: 'Get tenant detail (admin)' })
  async getTenant(@Param('id') id: string) {
    return this.tenantRepo.findOne({
      where: { id },
      relations: ['stores', 'staff'],
    });
  }

  @Patch('tenants/:id/status')
  @ApiOperation({ summary: 'Update tenant status (admin)' })
  async updateTenantStatus(
    @Param('id') id: string,
    @Body() body: { status: TenantStatus },
  ) {
    await this.tenantRepo.update(id, { status: body.status });
    return this.tenantRepo.findOne({ where: { id } });
  }

  @Patch('tenants/:id')
  @ApiOperation({ summary: 'Update tenant fields (admin)' })
  async updateTenant(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      slug?: string;
      plan?: TenantPlan;
      status?: TenantStatus;
      billingEmail?: string;
      trialEndsAt?: string | Date | null;
    },
  ) {
    const patch: Record<string, unknown> = {};
    if (body.name !== undefined) patch.name = body.name;
    if (body.slug !== undefined) patch.slug = body.slug;
    if (body.plan !== undefined) patch.plan = body.plan;
    if (body.status !== undefined) patch.status = body.status;
    if (body.billingEmail !== undefined) patch.billingEmail = body.billingEmail;
    if (body.trialEndsAt !== undefined) {
      patch.trialEndsAt = body.trialEndsAt ? new Date(body.trialEndsAt) : null;
    }
    await this.tenantRepo.update(id, patch as any);
    return this.tenantRepo.findOne({ where: { id }, relations: ['stores', 'staff'] });
  }

  @Patch('tenants/:id/extend-trial')
  @ApiOperation({ summary: 'Extend trial by N days (admin)' })
  async extendTrial(
    @Param('id') id: string,
    @Body() body: { days?: number },
  ) {
    const days = Number(body.days) > 0 ? Number(body.days) : 14;
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) return { ok: false, error: 'tenant_not_found' };
    const base = tenant.trialEndsAt && new Date(tenant.trialEndsAt) > new Date()
      ? new Date(tenant.trialEndsAt)
      : new Date();
    base.setDate(base.getDate() + days);
    await this.tenantRepo.update(id, { trialEndsAt: base, status: TenantStatus.TRIAL });
    return this.tenantRepo.findOne({ where: { id } });
  }

  @Delete('tenants/:id')
  @ApiOperation({ summary: 'Delete tenant (admin) — cascades to stores/staff/orders' })
  async deleteTenant(@Param('id') id: string) {
    // Manual cascade: not every related table has FK ON DELETE CASCADE.
    // Run everything in a transaction so a failure leaves nothing partially deleted.
    await this.dataSource.transaction(async (m) => {
      const r = (sql: string, params: unknown[] = []) => m.query(sql, params);

      // Find this tenant's stores first (for store-scoped tables that don't carry tenantId).
      const storeRows: Array<{ id: string }> = await r(
        `SELECT id FROM stores WHERE "tenantId" = $1`,
        [id],
      );
      const storeIds = storeRows.map((s) => s.id);

      // Find this tenant's orders (for order_items)
      const orderRows: Array<{ id: string }> = await r(
        `SELECT id FROM orders WHERE "tenantId" = $1`,
        [id],
      );
      const orderIds = orderRows.map((o) => o.id);

      // Children first
      if (orderIds.length) {
        await r(`DELETE FROM order_items WHERE "orderId" = ANY($1::uuid[])`, [orderIds]);
      }
      if (storeIds.length) {
        await r(`DELETE FROM parking_spots WHERE "storeId" = ANY($1::uuid[])`, [storeIds]);
      }

      // Tenant-scoped tables (no FK / no cascade)
      const tenantScoped = [
        'invoices',
        'commission_transactions',
        'commission_rules',
        'loyalty_transactions',
        'loyalty_accounts',
        'blocked_customers',
        'pos_integrations',
        'products',
        'product_categories',
        'orders',
        'subscriptions',
        'staff',
        'stores',
      ];
      for (const t of tenantScoped) {
        await r(`DELETE FROM "${t}" WHERE "tenantId" = $1`, [id]);
      }

      // Finally the tenant itself
      await r(`DELETE FROM tenants WHERE id = $1`, [id]);
    });
    return { ok: true };
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'List all subscriptions (admin)' })
  async getSubscriptions(@Query('page') page = 1, @Query('limit') limit = 20) {
    const [subs, total] = await this.subRepo.findAndCount({
      relations: ['tenant', 'plan'],
      order: { createdAt: 'DESC' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });
    return { subscriptions: subs, total, page: Number(page), limit: Number(limit) };
  }
}
