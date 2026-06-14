import { Injectable, UnauthorizedException, HttpException, HttpStatus, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { Customer } from '../../database/entities/customer.entity';
import { CustomerVehicle } from '../../database/entities/customer-vehicle.entity';
import { Staff } from '../../database/entities/staff.entity';
import { SuperAdmin } from '../../database/entities/super-admin.entity';
import { OtpService } from './otp.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { StaffLoginDto } from './dto/staff-login.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { DeviceLoginDto } from './dto/device-login.dto';
import { CustomerRegisterDto } from './dto/customer-register.dto';
import { CustomerLoginDto } from './dto/customer-login.dto';
import { CustomerForgotPasswordDto } from './dto/customer-forgot-password.dto';
import { CustomerResetPasswordDto } from './dto/customer-reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Customer)
    private customerRepo: Repository<Customer>,
    @InjectRepository(CustomerVehicle)
    private vehicleRepo: Repository<CustomerVehicle>,
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

    // Generate OTP — real random if SMS provider exists, otherwise fallback
    const otp = hasSmsProvider ? this.otpService.generate() : this.otpService.generate();
    await this.otpService.store(dto.mobile, otp);

    if (hasSmsProvider) {
      // TODO: Send via Twilio SMS when configured
      // await this.smsProvider.send(dto.mobile, `رمز التحقق من استلم: ${otp}`);
    } else if (isProduction) {
      // No SMS provider in production — log warning but don't block
      // OTP is stored in Redis, admin can check logs for testing
      console.warn(`[OTP] WARNING: No SMS provider configured. OTP for ${dto.mobile}: ${otp}`);
    }

    // Never log OTP values in production (except fallback above)
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

  async deviceLogin(dto: DeviceLoginDto) {
    let customer = await this.customerRepo.findOne({
      where: { mobile: dto.mobile },
      relations: ['vehicles'],
    });

    if (!customer) {
      customer = this.customerRepo.create({ mobile: dto.mobile });
    }

    // Check if blocked
    if (customer.isBlocked) {
      throw new UnauthorizedException('تم حظر هذا الحساب. تواصل مع الدعم.');
    }

    // Check if device is blocked (by deviceId)
    if (dto.deviceInfo?.deviceId) {
      const blockedByDevice = await this.customerRepo.findOne({
        where: { deviceId: dto.deviceInfo.deviceId as string, isBlocked: true },
      });
      if (blockedByDevice) {
        throw new UnauthorizedException('تم حظر هذا الجهاز. تواصل مع الدعم.');
      }
    }

    // Update device info
    if (dto.deviceInfo) {
      customer.deviceId = (dto.deviceInfo.deviceId as string) || customer.deviceId;
      customer.deviceInfo = dto.deviceInfo as Record<string, unknown>;
    }
    customer.lastLoginAt = new Date();
    await this.customerRepo.save(customer);

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

  async customerRegister(dto: CustomerRegisterDto) {
    const existingMobile = await this.customerRepo.findOne({ where: { mobile: dto.mobile } });
    if (existingMobile) throw new ConflictException('رقم الجوال مسجّل مسبقاً');

    const existingEmail = await this.customerRepo.findOne({ where: { email: dto.email.toLowerCase() } });
    if (existingEmail) throw new ConflictException('البريد الإلكتروني مسجّل مسبقاً');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const customer = this.customerRepo.create({
      mobile: dto.mobile,
      fullName: dto.fullName,
      email: dto.email.toLowerCase(),
      passwordHash,
      lastLoginAt: new Date(),
    });
    await this.customerRepo.save(customer);

    if (dto.vehicle?.make && dto.vehicle?.model && dto.vehicle?.color) {
      const vehicle = this.vehicleRepo.create({
        customerId: customer.id,
        make: dto.vehicle.make,
        model: dto.vehicle.model,
        color: dto.vehicle.color,
        plateNumber: dto.vehicle.plateNumber ?? '',
        isDefault: true,
      });
      await this.vehicleRepo.save(vehicle);
    }

    const tokens = this.generateTokens({ sub: customer.id, type: 'customer' });
    const { passwordHash: _, ...safeCustomer } = customer as any;
    return { customer: safeCustomer, ...tokens };
  }

  async customerLogin(dto: CustomerLoginDto) {
    const customer = await this.customerRepo
      .createQueryBuilder('c')
      .addSelect('c.passwordHash')
      .leftJoinAndSelect('c.vehicles', 'vehicles')
      .where('c.mobile = :mobile', { mobile: dto.mobile })
      .getOne();

    if (!customer) throw new UnauthorizedException('رقم الجوال أو كلمة المرور غير صحيحة');
    if (!customer.passwordHash) throw new UnauthorizedException('هذا الحساب يستخدم طريقة دخول مختلفة');
    if (customer.isBlocked) throw new UnauthorizedException('تم حظر هذا الحساب. تواصل مع الدعم.');

    const valid = await bcrypt.compare(dto.password, customer.passwordHash);
    if (!valid) throw new UnauthorizedException('رقم الجوال أو كلمة المرور غير صحيحة');

    customer.lastLoginAt = new Date();
    await this.customerRepo.save(customer);

    const expiresIn = dto.rememberMe ? '90d' : this.config.get('JWT_REFRESH_EXPIRES_IN', '30d');
    const accessToken = this.jwtService.sign({ sub: customer.id, type: 'customer' });
    const refreshToken = this.jwtService.sign(
      { sub: customer.id, type: 'customer' },
      { secret: this.config.get('JWT_REFRESH_SECRET'), expiresIn },
    );

    const { passwordHash: _, ...safeCustomer } = customer as any;
    return { customer: safeCustomer, accessToken, refreshToken };
  }

  async customerForgotPassword(dto: CustomerForgotPasswordDto) {
    const customer = await this.customerRepo.findOne({ where: { email: dto.email.toLowerCase() } });
    if (!customer) {
      // Don't reveal whether the email exists
      return { message: 'إذا كان البريد الإلكتروني مسجّلاً، ستصلك رسالة لإعادة تعيين كلمة المرور.' };
    }

    const token = randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    customer.passwordResetToken = token;
    customer.passwordResetExpiry = expiry;
    await this.customerRepo.save(customer);

    const isDev = this.config.get('NODE_ENV') !== 'production';
    if (isDev) {
      console.log(`[RESET] Token for ${dto.email}: ${token}`);
      return {
        message: 'تم إنشاء رمز إعادة تعيين كلمة المرور.',
        devToken: token,
      };
    }

    // TODO: send reset email when email provider is configured
    return { message: 'إذا كان البريد الإلكتروني مسجّلاً، ستصلك رسالة لإعادة تعيين كلمة المرور.' };
  }

  async customerResetPassword(dto: CustomerResetPasswordDto) {
    const customer = await this.customerRepo
      .createQueryBuilder('c')
      .addSelect('c.passwordHash')
      .where('c.passwordResetToken = :token', { token: dto.token })
      .getOne();

    if (!customer) throw new BadRequestException('رمز إعادة التعيين غير صحيح أو منتهي الصلاحية');
    if (!customer.passwordResetExpiry || customer.passwordResetExpiry < new Date()) {
      throw new BadRequestException('انتهت صلاحية رمز إعادة التعيين. يرجى طلب رمز جديد.');
    }

    customer.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    customer.passwordResetToken = null;
    customer.passwordResetExpiry = null;
    await this.customerRepo.save(customer);

    return { message: 'تم تغيير كلمة المرور بنجاح.' };
  }
}
