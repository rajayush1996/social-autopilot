import { seedSuperAdmin } from '../src/config/seedAdmin.js';
import { prisma } from '../src/config/db.js';

async function main() {
  console.log('🌱 Running Database Seed...');
  await seedSuperAdmin();
  console.log('✅ Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
