import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { OtpService } from '../otp.service';
import { Customer } from '../../../database/entities/customer.entity';
import { Staff } from '../../../database/entities/staff.entity';
import { SuperAdmin } from '../../../database/entities/super-admin.entity';

const mockRepo = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
});

describe('AuthService', () => {
  let service: AuthService;
  let customerRepo: any;
  let staffRepo: any;
  let jwtService: JwtService;
  let otpService: OtpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(Customer), useFactory: mockRepo },
        { provide: getRepositoryToken(Staff), useFactory: mockRepo },
        { provide: getRepositoryToken(SuperAdmin), useFactory: mockRepo },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
            verify: jest.fn().mockReturnValue({ sub: 'test-id', type: 'customer' }),
          },
        },
        {
          provide: OtpService,
          useValue: {
            generate: jest.fn().mockReturnValue('123456'),
            store: jest.fn().mockResolvedValue(true),
            verify: jest.fn().mockResolvedValue(true),
            getRateLimit: jest.fn().mockResolvedValue(0),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                TWILIO_ACCOUNT_SID: '',
                JWT_SECRET: 'test-secret',
                JWT_REFRESH_SECRET: 'test-refresh-secret',
                JWT_EXPIRES_IN: '15m',
                JWT_REFRESH_EXPIRES_IN: '7d',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    customerRepo = module.get(getRepositoryToken(Customer));
    staffRepo = module.get(getRepositoryToken(Staff));
    jwtService = module.get<JwtService>(JwtService);
    otpService = module.get<OtpService>(OtpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendOtp', () => {
    it('should send OTP successfully', async () => {
      const result = await service.sendOtp({ mobile: '+966512345678' });
      expect(result).toEqual({ message: 'OTP sent successfully' });
      expect(otpService.store).toHaveBeenCalledWith('+966512345678', '123456');
    });

    it('should rate-limit excessive OTP requests', async () => {
      (otpService.getRateLimit as jest.Mock).mockResolvedValueOnce(10);
      await expect(service.sendOtp({ mobile: '+966512345678' })).rejects.toThrow();
    });
  });

  describe('verifyOtp', () => {
    it('should create new customer on first login', async () => {
      customerRepo.findOne.mockResolvedValue(null);
      customerRepo.create.mockReturnValue({ id: 'new-id', mobile: '+966512345678' });
      customerRepo.save.mockResolvedValue({ id: 'new-id', mobile: '+966512345678' });

      const result = await service.verifyOtp({ mobile: '+966512345678', otp: '123456' });
      expect(result).toHaveProperty('accessToken');
      expect(customerRepo.create).toHaveBeenCalled();
    });

    it('should return existing customer on repeated login', async () => {
      customerRepo.findOne.mockResolvedValue({
        id: 'existing-id',
        mobile: '+966512345678',
        vehicles: [],
      });

      const result = await service.verifyOtp({ mobile: '+966512345678', otp: '123456' });
      expect(result).toHaveProperty('accessToken');
      expect(customerRepo.create).not.toHaveBeenCalled();
    });

    it('should reject invalid OTP', async () => {
      (otpService.verify as jest.Mock).mockResolvedValueOnce(false);
      await expect(
        service.verifyOtp({ mobile: '+966512345678', otp: '000000' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('staffLogin', () => {
    it('should reject non-existent staff', async () => {
      staffRepo.findOne.mockResolvedValue(null);
      await expect(
        service.staffLogin({ phone: '+966500000000', pin: '1234' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
