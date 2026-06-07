import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnsureFreeTextEnum1749300000000 implements MigrationInterface {
  name = 'EnsureFreeTextEnum1749300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Convert enum columns to varchar for robustness
    const enumColumns = ['type', 'paymentMethod', 'paymentStatus'];

    for (const col of enumColumns) {
      const info = await queryRunner.query(`
        SELECT data_type, udt_name
        FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = $1
      `, [col]);

      if (info.length > 0 && info[0].data_type === 'USER-DEFINED') {
        const udtName = info[0].udt_name;
        console.log(`[Migration] Converting orders."${col}" from enum "${udtName}" to varchar(30)`);

        await queryRunner.query(`
          ALTER TABLE orders
          ALTER COLUMN "${col}" TYPE varchar(30) USING "${col}"::text
        `);

        // Set defaults
        if (col === 'type') {
          await queryRunner.query(`ALTER TABLE orders ALTER COLUMN "${col}" SET DEFAULT 'catalog'`);
        } else if (col === 'paymentStatus') {
          await queryRunner.query(`ALTER TABLE orders ALTER COLUMN "${col}" SET DEFAULT 'pending'`);
        }

        // Try to drop old enum type
        try {
          await queryRunner.query(`DROP TYPE IF EXISTS "${udtName}"`);
        } catch { /* ignore if in use */ }
      } else {
        console.log(`[Migration] orders."${col}" is already varchar or not found — skipping`);
      }
    }

    // Ensure rawRequest column exists
    const rawReqCheck = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'orders' AND column_name IN ('rawRequest', 'raw_request')
    `);
    if (rawReqCheck.length === 0) {
      await queryRunner.query(`ALTER TABLE orders ADD COLUMN "rawRequest" text`);
      console.log('[Migration] Added rawRequest column');
    }

    // Ensure aiParsed column exists
    const aiParsedCheck = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'orders' AND column_name IN ('aiParsed', 'ai_parsed')
    `);
    if (aiParsedCheck.length === 0) {
      await queryRunner.query(`ALTER TABLE orders ADD COLUMN "aiParsed" jsonb`);
      console.log('[Migration] Added aiParsed column');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No-op — safer to leave as varchar
  }
}
