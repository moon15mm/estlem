import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function cleanupOldColumns(ds: DataSource) {
  try {
    const qr = ds.createQueryRunner();
    // Drop any leftover columns from previous failed migrations
    await qr.query(`ALTER TABLE stores DROP COLUMN IF EXISTS "serviceMode"`).catch(() => {});
    await qr.query(`ALTER TABLE stores DROP COLUMN IF EXISTS service_mode`).catch(() => {});
    await qr.query(`ALTER TABLE parking_spots DROP COLUMN IF EXISTS "type"`).catch(() => {});
    await qr.query(`ALTER TABLE parking_spots DROP COLUMN IF EXISTS spot_type`).catch(() => {});
    await qr.release();
    console.log('[DB] Cleaned up old columns');
  } catch (e) {
    console.warn('[DB] Cleanup skipped:', (e as Error).message);
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: (origin, callback) => {
        const allowed = [
          process.env.FRONTEND_URL,
          process.env.DASHBOARD_URL,
        ].filter(Boolean);
        const isLocal = /^https?:\/\/localhost(:\d+)?$/.test(origin);
        const ok =
          !origin ||
          allowed.includes(origin) ||
          /\.estlem\.store$/.test(origin) ||
          origin === 'https://estlem.store' ||
          (process.env.NODE_ENV !== 'production' && isLocal);
        // Never reject — just disable credentials for unknown origins
        callback(null, ok ? origin : false);
      },
      credentials: true,
    },
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);

  app.use(helmet());
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Clean up old broken columns
  const ds = app.get(DataSource);
  await cleanupOldColumns(ds);

  const port = configService.get<number>('PORT', 3001);
  await app.listen(port);
  console.log(`Estlem API running on port ${port}`);
}

bootstrap();
