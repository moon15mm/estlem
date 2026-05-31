import { IsString, IsEnum, IsOptional, IsUUID, Length } from 'class-validator';
import { StaffRole } from '@estlem/shared';

export class CreateStaffDto {
  @IsString()
  name: string;

  @IsString()
  mobile: string;

  @IsEnum(StaffRole)
  role: StaffRole;

  @IsUUID()
  storeId: string;

  @IsOptional()
  @IsString()
  @Length(4, 6)
  pin?: string;

  @IsOptional()
  @IsString()
  password?: string;
}
