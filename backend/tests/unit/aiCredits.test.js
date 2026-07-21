import { describe, it } from 'node:test';
import assert from 'node:assert';
import { prisma } from '../../src/config/db.js';

describe('AI Credits & Plan Model Unit Tests', () => {
  it('should verify User model contains plan and aiCredits fields', async () => {
    // Generate or query a test user
    const testUserId = `test-credit-user-${Date.now()}`;
    try {
      const user = await prisma.user.create({
        data: {
          id: testUserId,
          email: `test_credits_${testUserId}@socialautopilot.internal`,
          name: 'Credits Tester',
          aiCredits: 10,
          plan: 'PRO',
        },
      });

      assert.strictEqual(user.aiCredits, 10);
      assert.strictEqual(user.plan, 'PRO');

      // Test decrementing
      const updatedUser = await prisma.user.update({
        where: { id: testUserId },
        data: {
          aiCredits: {
            decrement: 1,
          },
        },
      });

      assert.strictEqual(updatedUser.aiCredits, 9);
    } finally {
      // Clean up
      try {
        await prisma.user.delete({ where: { id: testUserId } });
      } catch (err) {
        // ignore
      }
    }
  });
});
