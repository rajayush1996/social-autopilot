import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setSuperAdmin() {
  console.log('--- Granting SUPER_ADMIN Role to User ---');
  
  const user = await prisma.user.findFirst({
    where: { email: 'ayushraj8571@gmail.com' }
  });

  if (user) {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        role: 'SUPER_ADMIN',
        uniqueId: user.uniqueId || `USR-${Math.floor(100000 + Math.random() * 900000)}`
      }
    });
    console.log(`✅ Successfully set user "${updated.email}" (${updated.uniqueId}) as SUPER_ADMIN!`);
  } else {
    console.log('User not found.');
  }
}

setSuperAdmin()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
