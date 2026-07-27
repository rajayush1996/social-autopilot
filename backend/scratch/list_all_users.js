import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listAllUsers() {
  const users = await prisma.user.findMany();
  console.log(`Total users in DB: ${users.length}`);
  for (const u of users) {
    console.log(`User ID: ${u.id} | Email: ${u.email} | Credits: ${u.aiCredits} | Plan: ${u.plan}`);
  }

  // Top up all users to 100 AI credits so testing never runs out
  await prisma.user.updateMany({
    data: { aiCredits: 100 }
  });
  console.log('✅ Updated all users to 100 AI Credits for development & testing.');
}

listAllUsers()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
