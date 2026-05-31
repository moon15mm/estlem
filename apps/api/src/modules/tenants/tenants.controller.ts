import { Controller, Post, Get, Put, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TenantsService, RegisterTenantDto } from './tenants.service';
import { TenantPlan, TenantStatus } from '@estlem/shared';

@Controller('tenants')
export class TenantsController {
  constructor(private service: TenantsService) {}

  @Post('register')
  register(@Body() dto: RegisterTenantDto) {
    return this.service.register(dto);
  }

  @Get('admin/stats')
  getAdminStats() {
    return this.service.getAdminStats();
  }

  @Get('admin/list')
  listAll() {
    return this.service.listAll();
  }

  @Patch(':id/admin-update')
  adminUpdate(
    @Param('id') id: string,
    @Body() dto: { plan?: TenantPlan; status?: TenantStatus },
  ) {
    return this.service.adminUpdate(id, dto.plan, dto.status);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  me(@Request() req: { user: { tenantId: string } }) {
    return this.service.findById(req.user.tenantId);
  }

  @Put('me/settings')
  @UseGuards(AuthGuard('jwt'))
  updateSettings(
    @Body() settings: Record<string, unknown>,
    @Request() req: { user: { tenantId: string } },
  ) {
    return this.service.updateSettings(req.user.tenantId, settings);
  }
}

