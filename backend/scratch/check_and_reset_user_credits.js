import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAndResetCredits() {
  console.log('--- Inspecting User AI Credits ---');
  const user = await prisma.user.findFirst();

  if (user) {
    console.log(`User ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Current AI Credits: ${user.aiCredits}`);
    console.log(`Plan: ${user.plan}`);

    if (user.aiCredits <= 0) {
      console.log('User has 0 AI Credits. Resetting to 100 AI credits for testing...');
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { aiCredits: 100 }
      });
      console.log(`✅ Successfully updated AI Credits to ${updated.aiCredits}!`);
    } else {
      console.log(`User has ${user.aiCredits} AI credits remaining.`);
    }
  } else {
    console.log('No user found in database.');
  }
}

checkAndResetCredits()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
