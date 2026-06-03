import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDineInColumns1748930000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add serviceMode column to stores
    const hasServiceMode = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'stores' AND column_name = 'serviceMode'
    `);
    if (!hasServiceMode.length) {
      await queryRunner.query(`ALTER TABLE "stores" ADD COLUMN "serviceMode" varchar(20) DEFAULT 'drive_through'`);
    }

    // Add type column to parking_spots
    const hasType = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'parking_spots' AND column_name = 'type'
    `);
    if (!hasType.length) {
      await queryRunner.query(`ALTER TABLE "parking_spots" ADD COLUMN "type" varchar(20) DEFAULT 'parking'`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "stores" DROP COLUMN IF EXISTS "serviceMode"`);
    await queryRunner.query(`ALTER TABLE "parking_spots" DROP COLUMN IF EXISTS "type"`);
  }
}
