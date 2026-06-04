import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  UseGuards, Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { StaffRole } from '@estlem/shared';
import { CustomersService } from './customers.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

class UpdateProfileDto {
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsString() preferredLang?: string;
}

class AddVehicleDto {
  @IsString() make: string;
  @IsString() model: string;
  @IsString() color: string;
  @IsString() plateNumber: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

class BlockCustomerDto {
  @IsOptional() @IsString() reason?: string;
}

@Controller('customers')
export class CustomersController {
  constructor(private service: CustomersService) {}

  // ─── Customer's own profile (JWT type='customer') ────────────

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  me(@Request() req: { user: { sub: string; type: string } }) {
    if (req.user.type !== 'customer') throw new Error('Customers only');
    return this.service.getMyProfile(req.user.sub);
  }

  @Patch('me')
  @UseGuards(AuthGuard('jwt'))
  updateMe(
    @Body() dto: UpdateProfileDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.service.updateMyProfile(req.user.sub, dto);
  }

  @Post('me/vehicles')
  @UseGuards(AuthGuard('jwt'))
  addVehicle(
    @Body() dto: AddVehicleDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.service.addVehicle(req.user.sub, dto);
  }

  @Delete('me/vehicles/:id')
  @UseGuards(AuthGuard('jwt'))
  deleteVehicle(
    @Param('id') id: string,
    @Request() req: { user: { sub: string } },
  ) {
    return this.service.deleteVehicle(req.user.sub, id);
  }

  // ─── Store/Staff side: block / unblock ───────────────────────

  @Post(':customerId/block')
  @UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
  @Roles(StaffRole.OWNER, StaffRole.MANAGER)
  block(
    @Param('customerId') customerId: string,
    @Body() dto: BlockCustomerDto,
    @Request() req: { user: { sub: string; tenantId: string } },
  ) {
    return this.service.blockCustomer(customerId, req.user.tenantId, req.user.sub, dto.reason);
  }

  @Post(':customerId/unblock')
  @UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
  @Roles(StaffRole.OWNER, StaffRole.MANAGER)
  unblock(
    @Param('customerId') customerId: string,
    @Request() req: { user: { tenantId: string } },
  ) {
    return this.service.unblockCustomer(customerId, req.user.tenantId);
  }

  @Get('blocked/list')
  @UseGuards(AuthGuard('jwt'), TenantGuard)
  listBlocked(@Request() req: { user: { tenantId: string } }) {
    return this.service.listBlocked(req.user.tenantId);
  }
}
