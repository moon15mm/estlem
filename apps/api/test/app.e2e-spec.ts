import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * E2E tests for ESTLEM API
 *
 * These tests require a running PostgreSQL and Redis instance.
 * Run with: DATABASE_URL=... REDIS_URL=... npx jest --config test/jest-e2e.json
 */
describe('ESTLEM API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health', () => {
    it('GET /api/v1/health should return OK', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
        });
    });
  });

  describe('Auth - Customer OTP', () => {
    it('POST /api/v1/auth/customer/send-otp should accept valid Saudi number', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/customer/send-otp')
        .send({ mobile: '+966512345678' })
        .expect(201)
        .expect((res) => {
          expect(res.body.message).toBe('OTP sent successfully');
        });
    });

    it('POST /api/v1/auth/customer/verify-otp should login with test OTP', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/customer/verify-otp')
        .send({ mobile: '+966512345678', otp: '123456' })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body).toHaveProperty('customer');
        });
    });

    it('POST /api/v1/auth/customer/verify-otp should reject wrong OTP', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/customer/verify-otp')
        .send({ mobile: '+966512345678', otp: '000000' })
        .expect(401);
    });
  });

  describe('Subscription Plans', () => {
    it('GET /api/v1/subscriptions/plans should return plans', () => {
      return request(app.getHttpServer())
        .get('/api/v1/subscriptions/plans')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('Protected Endpoints', () => {
    it('should reject unauthenticated requests', () => {
      return request(app.getHttpServer())
        .get('/api/v1/stores/tenant/my-stores')
        .expect(401);
    });
  });
});
