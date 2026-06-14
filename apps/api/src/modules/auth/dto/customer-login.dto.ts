import { IsString, IsOptional, IsBoolean, Matches } from 'class-validator';

export class CustomerLoginDto {
  @IsString()
  @Matches(/^\+?[0-9]{9,15}$/, { message: 'رقم الجوال غير صحيح' })
  mobile: string;

  @IsString()
  password: string;

  @IsBoolean()
  @IsOptional()
  rememberMe?: boolean;
}
