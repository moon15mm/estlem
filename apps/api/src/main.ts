import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function ensureColumns(ds: DataSource) {
  try {
    const qr = ds.createQueryRunner();
    const cols = await qr.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'stores'`);
    const colNames = cols.map((c: any) => c.column_name);
    if (!colNames.includes('serviceMode')) {
      await qr.query(`ALTER TABLE "stores" ADD COLUMN "serviceMode" varchar(20) DEFAULT 'drive_through'`);
      console.log('[DB] Added stores.serviceMode column');
    }
    const spotCols = await qr.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'parking_spots'`);
    const spotColNames = spotCols.map((c: any) => c.column_name);
    if (!spotColNames.includes('type')) {
      await qr.query(`ALTER TABLE "parking_spots" ADD COLUMN "type" varchar(20) DEFAULT 'parking'`);
      console.log('[DB] Added parking_spots.type column');
    }
    await qr.release();
  } catch (e) {
    console.warn('[DB] Column migration skipped:', (e as Error).message);
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

  // Auto-add missing DB columns on startup
  const ds = app.get(DataSource);
  await ensureColumns(ds);

  const port = configService.get<number>('PORT', 3001);
  await app.listen(port);
  console.log(`Estlem API running on port ${port}`);
}

bootstrap();
