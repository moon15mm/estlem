import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, IsObject } from 'class-validator';
import { StoreCategory } from '@estlem/shared';

export class CreateStoreDto {
  @IsString() name: string;
  @IsString() nameAr: string;
  @IsEnum(StoreCategory) category: StoreCategory;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsNumber() lat?: number;
  @IsOptional() @IsNumber() lng?: number;
  @IsOptional() @IsNumber() geofenceRadius?: number;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() coverUrl?: string;
  @IsOptional() @IsObject() operatingHours?: Record<string, unknown>;
  @IsOptional() @IsString() phoneNumber?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
