import { IsString, Matches, IsOptional, IsObject } from 'class-validator';

export class DeviceInfoDto {
  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  os?: string;

  @IsOptional()
  @IsString()
  osVersion?: string;

  @IsOptional()
  @IsString()
  appVersion?: string;
}

export class DeviceLoginDto {
  @IsString()
  @Matches(/^\+?[0-9]{9,15}$/, { message: 'Invalid mobile number' })
  mobile: string;

  @IsOptional()
  @IsObject()
  deviceInfo?: DeviceInfoDto;
}
