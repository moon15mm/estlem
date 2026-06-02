import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StaffRole } from '@estlem/shared';
import { StaffService, CreateStaffDto } from './staff.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';

@Controller('staff')
@UseGuards(AuthGuard('jwt'), TenantGuard)
export class StaffController {
  constructor(private service: StaffService) {}

  @Get('store/:storeId')
  findAll(@Param('storeId') storeId: string, @Request() req: { user: { tenantId: string } }) {
    return this.service.findByStore(storeId, req.user.tenantId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(StaffRole.OWNER, StaffRole.MANAGER)
  create(@Body() dto: CreateStaffDto, @Request() req: { user: { tenantId: string } }) {
    return this.service.create(dto, req.user.tenantId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(StaffRole.OWNER, StaffRole.MANAGER)
  deactivate(@Param('id') id: string, @Request() req: { user: { tenantId: string } }) {
    return this.service.deactivate(id, req.user.tenantId);
  }
}
