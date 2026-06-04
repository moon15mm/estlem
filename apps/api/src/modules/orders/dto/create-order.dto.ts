import {
  IsEnum, IsOptional, IsString, IsArray, ValidateNested,
  IsNumber, IsUUID, Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderType, PaymentMethod } from '@estlem/shared';

class VehicleDto {
  @IsString() make: string;
  @IsString() model: string;
  @IsString() color: string;
  @IsString() plateNumber: string;
}

class CustomerDto {
  @IsString() fullName: string;
  @IsString() mobile: string;
  @IsOptional() @ValidateNested() @Type(() => VehicleDto) vehicle?: VehicleDto;
}

class OrderItemDto {
  @IsOptional() @IsUUID() productId?: string;
  @IsString() nameSnapshot: string;
  @IsOptional() @IsString() nameArSnapshot?: string;
  @IsNumber() @Min(0) priceSnapshot: number;
  @IsNumber() @Min(1) quantity: number;
  @IsOptional() @IsString() notes?: string;
}

export class CreateOrderDto {
  @IsUUID() storeId: string;
  @IsUUID() tenantId: string;

  @IsOptional() @IsUUID() parkingSpotId?: string;

  @IsEnum(OrderType) type: OrderType;
  @IsEnum(PaymentMethod) paymentMethod: PaymentMethod;

  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() rawRequest?: string;

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => OrderItemDto)
  items?: OrderItemDto[];

  @ValidateNested() @Type(() => CustomerDto) customer: CustomerDto;
}
