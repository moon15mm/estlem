import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { SuperAdmin } from '../entities/super-admin.entity';

async function seedAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const name = process.env.SUPER_ADMIN_NAME || 'Super Admin';

  if (!email || !password) {
    console.error('ERROR: SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD environment variables are required.');
    console.error('Usage: SUPER_ADMIN_EMAIL=admin@example.com SUPER_ADMIN_PASSWORD=StrongP@ss123 npx ts-node seed-admin.ts');
    process.exit(1);
  }

  if (password.length < 12) {
    console.error('ERROR: Password must be at least 12 characters long.');
    process.exit(1);
  }

  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [SuperAdmin],
    synchronize: true,
    ssl: process.env.DATABASE_URL?.includes('neon.tech')
      ? { rejectUnauthorized: false }
      : false,
  });

  await dataSource.initialize();
  console.log('Database connected, table synced.');

  const repo = dataSource.getRepository(SuperAdmin);

  const existing = await repo.findOne({ where: { email } });
  if (existing) {
    console.log(`Admin already exists: ${email}`);
    await dataSource.destroy();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const admin = repo.create({ email, passwordHash, name, isActive: true });
  await repo.save(admin);

  console.log(`Super admin created: ${email}`);
  console.log('IMPORTANT: Store your credentials securely. Do not share them.');
  await dataSource.destroy();
}

seedAdmin().catch((err) => {
  console.error('Failed to seed admin:', err);
  process.exit(1);
});
