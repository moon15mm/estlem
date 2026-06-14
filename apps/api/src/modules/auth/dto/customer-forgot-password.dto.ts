import { IsEmail } from 'class-validator';

export class CustomerForgotPasswordDto {
  @IsEmail({}, { message: 'البريد الإلكتروني غير صحيح' })
  email: string;
}
