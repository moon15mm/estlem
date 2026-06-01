import {
  Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StoresService } from './stores.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { CreateParkingSpotsDto } from './dto/create-parking-spots.dto';

@Controller('stores')
export class StoresController {
  constructor(private service: StoresService) {}

  // Public: search stores by name
  @Get('search')
  searchByName(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    if (!query || query.length < 2) return [];
    return this.service.searchByName(query, limit ? parseInt(limit, 10) : 20);
  }

  // Public: find nearby stores
  @Get('nearby')
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
      limit ? parseInt(limit, 10) : 20,
    );
  }

  // Public: resolve QR code
  @Get('qr/:qrCode')
  findByQr(@Param('qrCode') qrCode: string) {
    return this.service.findByQr(qrCode);
  }

  // Public: store profile
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  // Auth: owner/manager only
  @Get()
  @UseGuards(AuthGuard('jwt'))
  findAll(@Request() req: { user: { tenantId: string } }) {
    return this.service.findByTenant(req.user.tenantId);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  create(@Body() dto: CreateStoreDto, @Request() req: { user: { tenantId: string } }) {
    return this.service.create(dto, req.user.tenantId);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateStoreDto>,
    @Request() req: { user: { tenantId: string } },
  ) {
    return this.service.update(id, dto, req.user.tenantId);
  }

  @Post(':id/parking-spots')
  @UseGuards(AuthGuard('jwt'))
  createSpots(
    @Param('id') id: string,
    @Body() dto: CreateParkingSpotsDto,
    @Request() req: { user: { tenantId: string } },
  ) {
    return this.service.createParkingSpots(id, dto, req.user.tenantId);
  }

  @Get(':id/parking-spots')
  @UseGuards(AuthGuard('jwt'))
  getSpots(@Param('id') id: string) {
    return this.service.findSpotsByStore(id);
  }
}
