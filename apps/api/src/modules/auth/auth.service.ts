import { Injectable, UnauthorizedException, HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Customer } from '../../database/entities/customer.entity';
import { Staff } from '../../database/entities/staff.entity';
import { SuperAdmin } from '../../database/entities/super-admin.entity';
import { OtpService } from './otp.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { StaffLoginDto } from './dto/staff-login.dto';
import { AdminLoginDto } from './dto/admin-login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Customer)
    private customerRepo: Repository<Customer>,
    @InjectRepository(Staff)
    private staffRepo: Repository<Staff>,
    @InjectRepository(SuperAdmin)
    private superAdminRepo: Repository<SuperAdmin>,
    private jwtService: JwtService,
    private otpService: OtpService,
    private config: ConfigService,
  ) {}

  async sendOtp(dto: SendOtpDto): Promise<{ message: string }> {
    const rate = await this.otpService.getRateLimit(dto.mobile);
    if (rate > 5) throw new HttpException('Too many OTP requests', HttpStatus.TOO_MANY_REQUESTS);

    const isProduction = this.config.get('NODE_ENV') === 'production';
    const hasSmsProvider = !!this.config.get('TWILIO_ACCOUNT_SID');

    // In production, require a real SMS provider — never use hardcoded OTP
    if (isProduction && !hasSmsProvider) {
      throw new HttpException(
        'SMS provider not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const otp = hasSmsProvider ? this.otpService.generate() : '123456';
    await this.otpService.store(dto.mobile, otp);

    if (hasSmsProvider) {
      // TODO: Send via Twilio SMS when configured
      // await this.smsProvider.send(dto.mobile, `رمز التحقق من استلم: ${otp}`);
    }

    // Never log OTP values in production
    if (!isProduction) {
      console.log(`[OTP] ${dto.mobile}: ${otp} (dev mode)`);
    }

    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const valid = await this.otpService.verify(dto.mobile, dto.otp);
    if (!valid) throw new UnauthorizedException('Invalid or expired OTP');

    let customer = await this.customerRepo.findOne({
      where: { mobile: dto.mobile },
      relations: ['vehicles'],
    });

    if (!customer) {
      customer = this.customerRepo.create({ mobile: dto.mobile });
      await this.customerRepo.save(customer);
    }

    const tokens = this.generateTokens({ sub: customer.id, type: 'customer' });
    return { customer, ...tokens };
  }

  async staffLogin(dto: StaffLoginDto) {
    const staff = await this.staffRepo.findOne({
      where: { mobile: dto.mobile, isActive: true },
    });
    if (!staff) throw new UnauthorizedException('Invalid credentials');

    if (dto.pin) {
      const valid = await bcrypt.compare(dto.pin, staff.pinHash);
      if (!valid) throw new UnauthorizedException('Invalid PIN');
    } else if (dto.password) {
      const valid = await bcrypt.compare(dto.password, staff.passwordHash);
      if (!valid) throw new UnauthorizedException('Invalid password');
    } else {
      throw new BadRequestException('PIN or password required');
    }

    const tokens = this.generateTokens({
      sub: staff.id,
      type: 'staff',
      tenantId: staff.tenantId,
      storeId: staff.storeId,
      role: staff.role,
    });
    return { staff, ...tokens };
  }

  async adminLogin(dto: AdminLoginDto) {
    const admin = await this.superAdminRepo.findOne({
      where: { email: dto.email.toLowerCase(), isActive: true },
    });
    if (!admin) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    // Update last login
    admin.lastLoginAt = new Date();
    await this.superAdminRepo.save(admin);

    const accessToken = this.jwtService.sign(
      { sub: admin.id, type: 'superadmin', role: 'superadmin' },
      { expiresIn: '1h' },
    );

    return {
      admin: { id: admin.id, email: admin.email, name: admin.name },
      accessToken,
    };
  }

  private generateTokens(payload: Record<string, unknown>) {
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '30d'),
    });
    return { accessToken, refreshToken };
  }

  async refreshToken(token: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
      const { iat, exp, ...rest } = payload;
      return { accessToken: this.jwtService.sign(rest) };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
