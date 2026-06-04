import { Controller, Get, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../../database/entities/tenant.entity';
import { Subscription } from '../../database/entities/subscription.entity';
import { TenantStatus } from '@estlem/shared';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
export class AdminController {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepo: Repository<Tenant>,
    @InjectRepository(Subscription)
    private subRepo: Repository<Subscription>,
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
