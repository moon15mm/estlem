import {
  Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards, Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { StaffRole } from '@estlem/shared';
import { StoresService } from './stores.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { CreateParkingSpotsDto } from './dto/create-parking-spots.dto';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('stores')
export class StoresController {
  constructor(private service: StoresService) {}

  @Get('search')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  searchByName(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    if (!query || query.length < 2) return [];
    return this.service.searchByName(query, Math.min(limit ? parseInt(limit, 10) : 20, 50));
  }

  @Get('nearby')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  findNearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
    @Query('limit') limit?: string,
  ) {
    if (!lat || !lng) return [];
    const radiusKm = Math.min(parseFloat(radius || '10'), 50);
    return this.service.findNearby(
      parseFloat(lat), parseFloat(lng), radiusKm,
      Math.min(limit ? parseInt(limit, 10) : 20, 50),
    );
  }

  @Get('qr/:qrCode')
  findByQr(@Param('qrCode') qrCode: string) {
    return this.service.findByQr(qrCode);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), TenantGuard)
  findAll(@Request() req: { user: { tenantId: string } }) {
    return this.service.findByTenant(req.user.tenantId);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
  @Roles(StaffRole.OWNER, StaffRole.MANAGER)
  create(@Body() dto: CreateStoreDto, @Request() req: { user: { tenantId: string } }) {
    return this.service.create(dto, req.user.tenantId);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
  @Roles(StaffRole.OWNER, StaffRole.MANAGER)
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateStoreDto>,
    @Request() req: { user: { tenantId: string } },
  ) {
    return this.service.update(id, dto, req.user.tenantId);
  }

  @Patch(':id/languages')
  @UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
  @Roles(StaffRole.OWNER, StaffRole.MANAGER)
  updateLanguages(
    @Param('id') id: string,
    @Body() dto: { defaultLanguage?: string; supportedLanguages?: string[] },
    @Request() req: { user: { tenantId: string } },
  ) {
    return this.service.updateLanguages(id, dto, req.user.tenantId);
  }

  @Post(':id/parking-spots')
  @UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
  @Roles(StaffRole.OWNER, StaffRole.MANAGER)
  createSpots(
    @Param('id') id: string,
    @Body() dto: CreateParkingSpotsDto,
    @Request() req: { user: { tenantId: string } },
  ) {
    return this.service.createParkingSpots(id, dto, req.user.tenantId);
  }

  @Get(':id/parking-spots')
  @UseGuards(AuthGuard('jwt'), TenantGuard)
  getSpots(@Param('id') id: string) {
    return this.service.findSpotsByStore(id);
  }
}
