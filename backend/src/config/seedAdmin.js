import bcrypt from 'bcryptjs';
import { prisma } from './db.js';
import logger from '../utils/logger.js';

/**
 * Ensures a Super Admin account exists in the database.
 * If already present, skips creation. If missing, automatically seeds it.
 */
export async function seedSuperAdmin() {
  const adminEmail = (process.env.SUPER_ADMIN_EMAIL || 'ayushraj8571@gmail.com').toLowerCase().trim();
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD || 'Ayush@1234';

  try {
    const existing = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (existing) {
      if (existing.role !== 'SUPER_ADMIN') {
        await prisma.user.update({
          where: { id: existing.id },
          data: { role: 'SUPER_ADMIN' },
        });
        logger.info(`[Seed] 👑 Promoted existing user ${adminEmail} to SUPER_ADMIN.`);
      } else {
        logger.info(`[Seed] 👑 Super Admin (${adminEmail}) already exists. Skipping.`);
      }
      return existing;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const superAdmin = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Super Admin',
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        plan: 'ENTERPRISE',
        aiCredits: 9999,
        emailVerified: true,
        uniqueId: 'USR-SUPERADMIN',
        autopilotEnabled: false,
      },
    });

    logger.info(`[Seed] 👑 Super Admin account created successfully: ${adminEmail}`);
    return superAdmin;
  } catch (err) {
    logger.warn(`[Seed] ⚠️ Super Admin auto-seed notice: ${err.message}`);
  }
}

export default seedSuperAdmin;
