import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerDeviceFields1749400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "customers"
        ADD COLUMN IF NOT EXISTS "deviceId" varchar(255),
        ADD COLUMN IF NOT EXISTS "deviceInfo" jsonb,
        ADD COLUMN IF NOT EXISTS "isBlocked" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "blockedReason" varchar(255),
        ADD COLUMN IF NOT EXISTS "lastLoginAt" timestamptz
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "customers"
        DROP COLUMN IF EXISTS "deviceId",
        DROP COLUMN IF EXISTS "deviceInfo",
        DROP COLUMN IF EXISTS "isBlocked",
        DROP COLUMN IF EXISTS "blockedReason",
        DROP COLUMN IF EXISTS "lastLoginAt"
    `);
  }
}
