import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

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

  const port = configService.get<number>('PORT', 3001);
  await app.listen(port);
  console.log(`Estlem API running on port ${port}`);
}

bootstrap();
