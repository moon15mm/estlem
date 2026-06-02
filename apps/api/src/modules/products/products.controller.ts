import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, Request, BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StaffRole } from '@estlem/shared';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('products')
export class ProductsController {
  constructor(private service: ProductsService) {}

  @Get('store/:storeId')
  findAll(
    @Param('storeId') storeId: string,
    @Query() query: Record<string, string>,
    @Query('tenantId') tenantId: string,
  ) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    return this.service.findAll(storeId, tenantId, query);
  }

  @Get('store/:storeId/categories')
  getCategories(
    @Param('storeId') storeId: string,
    @Query('tenantId') tenantId: string,
  ) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    return this.service.getCategories(storeId, tenantId);
  }

  @Post('store/:storeId/categories')
  @UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
  @Roles(StaffRole.OWNER, StaffRole.MANAGER)
  createCategory(
    @Param('storeId') storeId: string,
    @Body() dto: { name?: string; nameAr: string; sortOrder?: number; imageUrl?: string },
    @Request() req: { user: { tenantId: string } },
  ) {
    return this.service.createCategory(storeId, req.user.tenantId, dto);
  }

  @Put('categories/:id')
  @UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
  @Roles(StaffRole.OWNER, StaffRole.MANAGER)
  updateCategory(
    @Param('id') id: string,
    @Body() dto: { name?: string; nameAr?: string; sortOrder?: number; imageUrl?: string },
    @Request() req: { user: { tenantId: string } },
  ) {
    return this.service.updateCategory(id, req.user.tenantId, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    return this.service.findById(id, tenantId);
  }

  @Post('store/:storeId')
  @UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
  @Roles(StaffRole.OWNER, StaffRole.MANAGER)
  create(
    @Param('storeId') storeId: string,
    @Body() dto: CreateProductDto,
    @Request() req: { user: { tenantId: string } },
  ) {
    return this.service.create(dto, storeId, req.user.tenantId);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
  @Roles(StaffRole.OWNER, StaffRole.MANAGER)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @Request() req: { user: { tenantId: string } },
  ) {
    return this.service.update(id, dto, req.user.tenantId);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
  @Roles(StaffRole.OWNER, StaffRole.MANAGER)
  remove(@Param('id') id: string, @Request() req: { user: { tenantId: string } }) {
    return this.service.remove(id, req.user.tenantId);
  }
}
