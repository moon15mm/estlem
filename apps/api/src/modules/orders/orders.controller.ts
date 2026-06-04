import {
  Controller, Post, Get, Patch, Body, Param, Query,
  UseGuards, Request, BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsString, IsUUID, IsNumber, IsArray, ValidateNested, Min, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { Throttle } from '@nestjs/throttler';
import { PaymentMethod } from '@estlem/shared';
import { OrdersService } from './orders.service';
import { AiCartService } from './ai-cart.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { TenantGuard } from '../../common/guards/tenant.guard';

class AiParseDto {
  @IsString() rawRequest: string;
  @IsUUID() storeId: string;
}

class QuoteItemDto {
  @IsUUID() itemId: string;
  @IsNumber() @Min(0) price: number;
}

class SubmitQuoteDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => QuoteItemDto)
  items: QuoteItemDto[];
}

class ApproveQuoteDto {
  @IsOptional() @IsEnum(PaymentMethod) paymentMethod?: PaymentMethod;
}

class RejectQuoteDto {
  @IsOptional() @IsString() reason?: string;
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

  // Store sends quote to customer for free-text items
  @Patch(':id/quote')
  @UseGuards(AuthGuard('jwt'), TenantGuard)
  submitQuote(
    @Param('id') id: string,
    @Body() dto: SubmitQuoteDto,
    @Request() req: { user: { tenantId: string } },
  ) {
    return this.ordersService.submitQuote(id, req.user.tenantId, dto.items);
  }

  // Customer approves the quote
  @Post(':id/approve-quote')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  approveQuote(@Param('id') id: string, @Body() dto: ApproveQuoteDto) {
    return this.ordersService.approveQuote(id, dto.paymentMethod);
  }

  // Customer rejects the quote
  @Post(':id/reject-quote')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  rejectQuote(@Param('id') id: string, @Body() dto: RejectQuoteDto) {
    return this.ordersService.rejectQuote(id, dto.reason);
  }
}
