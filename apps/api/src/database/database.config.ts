import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';

export const databaseConfig = (config: ConfigService): TypeOrmModuleOptions => {
  const isProduction = config.get('NODE_ENV') === 'production';
  const dbUrl = config.get<string>('DATABASE_URL') ?? '';
  const isNeon = dbUrl.includes('neon.tech');

  return {
    type: 'postgres',
    url: dbUrl,
    entities: [join(__dirname, '..', '**', '*.entity{.ts,.js}')],
    migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
    synchronize: false,
    logging: !isProduction,
    ssl: (isProduction || isNeon) ? { rejectUnauthorized: false } : false,
    extra: (isProduction || isNeon) ? {
      ssl: { rejectUnauthorized: false },
    } : undefined,
  };
};
