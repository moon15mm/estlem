import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';

export const databaseConfig = (config: ConfigService): TypeOrmModuleOptions => {
  const isProduction = config.get('NODE_ENV') === 'production';
  const dbUrl = config.get<string>('DATABASE_URL') ?? '';
  const requiresSsl = isProduction || dbUrl.includes('neon.tech') || dbUrl.includes('sslmode=require');

  // NOTE: rejectUnauthorized should be true in production with proper CA certs.
  // Set DB_SSL_REJECT_UNAUTHORIZED=true and provide CA cert via DB_SSL_CA env var.
  const rejectUnauthorized = config.get('DB_SSL_REJECT_UNAUTHORIZED') === 'true';

  return {
    type: 'postgres',
    url: dbUrl,
    entities: [join(__dirname, '..', '**', '*.entity{.ts,.js}')],
    migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
    migrationsRun: true,
    synchronize: false,
    logging: !isProduction,
    ssl: requiresSsl ? { rejectUnauthorized } : false,
    extra: requiresSsl ? {
      ssl: { rejectUnauthorized },
    } : undefined,
  };
};
