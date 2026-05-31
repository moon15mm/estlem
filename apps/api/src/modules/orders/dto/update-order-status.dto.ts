import { IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { OrderStatus } from '@estlem/shared';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus) status: OrderStatus;
  @IsOptional() @IsInt() @Min(1) @Max(120) estimatedMins?: number;
}
