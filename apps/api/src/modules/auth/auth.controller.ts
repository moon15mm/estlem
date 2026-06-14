import { Controller, Post, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { StaffLoginDto } from './dto/staff-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { DeviceLoginDto } from './dto/device-login.dto';
import { CustomerRegisterDto } from './dto/customer-register.dto';
import { CustomerLoginDto } from './dto/customer-login.dto';
import { CustomerForgotPasswordDto } from './dto/customer-forgot-password.dto';
import { CustomerResetPasswordDto } from './dto/customer-reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('otp/send')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  @Post('otp/verify')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Post('customer/device-login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  deviceLogin(@Body() dto: DeviceLoginDto) {
    return this.authService.deviceLogin(dto);
  }

  @Post('staff/login')
  @Throttle({ default: { limit: 5, ttl: 300000 } })
  staffLogin(@Body() dto: StaffLoginDto) {
    return this.authService.staffLogin(dto);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post('admin/login')
  @Throttle({ default: { limit: 5, ttl: 300000 } })
  adminLogin(@Body() dto: AdminLoginDto) {
    return this.authService.adminLogin(dto);
  }

  @Post('customer/register')
  @Throttle({ default: { limit: 5, ttl: 300000 } })
  customerRegister(@Body() dto: CustomerRegisterDto) {
    return this.authService.customerRegister(dto);
  }

  @Post('customer/login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  customerLogin(@Body() dto: CustomerLoginDto) {
    return this.authService.customerLogin(dto);
  }

  @Post('customer/forgot-password')
  @Throttle({ default: { limit: 3, ttl: 300000 } })
  customerForgotPassword(@Body() dto: CustomerForgotPasswordDto) {
    return this.authService.customerForgotPassword(dto);
  }

  @Post('customer/reset-password')
  @Throttle({ default: { limit: 5, ttl: 300000 } })
  customerResetPassword(@Body() dto: CustomerResetPasswordDto) {
    return this.authService.customerResetPassword(dto);
  }
}
