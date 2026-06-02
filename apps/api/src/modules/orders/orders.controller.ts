import {
  Controller, Post, Get, Patch, Body, Param, Query,
  UseGuards, Request, BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsString, IsUUID } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { OrdersService } from './orders.service';
import { AiCartService } from './ai-cart.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { TenantGuard } from '../../common/guards/tenant.guard';

class AiParseDto {
  @IsString() rawRequest: string;
  @IsUUID() storeId: string;
}

@Controller('orders')
export class OrdersController {
  constructor(
    private ordersService: OrdersService,
    private aiCart: AiCartService,
  ) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async create(@Body() dto: CreateOrderDto) {
    const verified = await this.ordersService.verifyStoreOwnership(dto.storeId, dto.tenantId);
    if (!verified) throw new BadRequestException('Invalid store or tenant');
    return this.ordersService.create(dto, dto.storeId, dto.tenantId);
  }

  @Post('ai-parse')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  aiParse(@Body() dto: AiParseDto) {
    return this.aiCart.parseShoppingList(dto.rawRequest, dto.storeId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  @Get('store/:storeId')
  @UseGuards(AuthGuard('jwt'), TenantGuard)
  findByStore(
    @Param('storeId') storeId: string,
    @Query() query: Record<string, string>,
    @Request() req: { user: { tenantId: string } },
  ) {
    return this.ordersService.findByStore(storeId, req.user.tenantId, query);
  }

  @Patch(':id/status')
  @UseGuards(AuthGuard('jwt'), TenantGuard)
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @Request() req: { user: { sub: string; tenantId: string } },
  ) {
    return this.ordersService.updateStatus(id, dto, req.user.sub, req.user.tenantId);
  }
}
