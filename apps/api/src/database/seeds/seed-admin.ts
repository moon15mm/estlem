import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { SuperAdmin } from '../entities/super-admin.entity';

async function seedAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL || 'moon15mm@gmail.com';
  const password = process.env.SUPER_ADMIN_PASSWORD || 'Estlem@2026!';
  const name = process.env.SUPER_ADMIN_NAME || 'Super Admin';

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
  console.log(`Password: ${password}`);
  console.log('IMPORTANT: Change this password after first login!');
  await dataSource.destroy();
}

seedAdmin().catch((err) => {
  console.error('Failed to seed admin:', err);
  process.exit(1);
});
