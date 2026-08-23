import { prisma } from '../config/db.js';

async function addColumns() {
  console.log('Adding targetAccountIds columns if not present...');
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "targetAccountIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
    `);
    console.log('✅ Added targetAccountIds to posts table.');
  } catch (e) {
    console.warn('Posts table notice:', e.message);
  }

  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "automation_schedules" ADD COLUMN IF NOT EXISTS "targetAccountIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
    `);
    console.log('✅ Added targetAccountIds to automation_schedules table.');
  } catch (e) {
    console.warn('AutomationSchedules table notice:', e.message);
  }

  process.exit(0);
}

addColumns().catch((err) => {
  console.error(err);
  process.exit(1);
});
