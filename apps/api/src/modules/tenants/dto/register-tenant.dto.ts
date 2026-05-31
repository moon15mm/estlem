import { IsString, IsEmail, IsOptional, IsEnum, Length } from 'class-validator';
import { TenantPlan, StoreCategory } from '@estlem/shared';

export class RegisterTenantDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsEmail()
  billingEmail: string;

  @IsOptional()
  @IsEnum(TenantPlan)
  plan?: TenantPlan;

  // Owner + first store (optional — if provided, bootstraps everything + returns token)
  @IsOptional() @IsString() ownerName?: string;
  @IsOptional() @IsString() ownerMobile?: string;
  @IsOptional() @IsString() @Length(4, 6) ownerPin?: string;
  @IsOptional() @IsString() storeName?: string;
  @IsOptional() @IsString() storeNameAr?: string;
  @IsOptional() @IsEnum(StoreCategory) storeCategory?: StoreCategory;
}
