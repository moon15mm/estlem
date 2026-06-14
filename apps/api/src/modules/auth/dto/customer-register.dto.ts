import { IsString, IsEmail, MinLength, Matches, IsOptional, Length } from 'class-validator';

export class CustomerVehicleDto {
  @IsString() @IsOptional() make?: string;
  @IsString() @IsOptional() model?: string;
  @IsString() @IsOptional() color?: string;
  @IsString() @IsOptional() plateNumber?: string;
}

export class CustomerRegisterDto {
  @IsString()
  @Matches(/^\+?[0-9]{9,15}$/, { message: 'رقم الجوال غير صحيح' })
  mobile: string;

  @IsString()
  @Length(2, 100, { message: 'الاسم يجب أن يكون بين 2 و 100 حرف' })
  fullName: string;

  @IsEmail({}, { message: 'البريد الإلكتروني غير صحيح' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' })
  password: string;

  @IsOptional()
  vehicle?: CustomerVehicleDto;
}
