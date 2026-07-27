import test from 'node:test';
import assert from 'node:assert';
import { createPostSchema } from '../../src/validations/postValidation.js';

test('createPostSchema Validation Rules', async (t) => {
  await t.test('passes when publishNow is true and scheduledAt is null', () => {
    const payload = {
      content: 'Hello World Test',
      publishNow: true,
      scheduledAt: null,
      targetPlatforms: ['LINKEDIN'],
    };
    const result = createPostSchema.body.safeParse(payload);
    assert.strictEqual(result.success, true);
  });

  await t.test('fails when publishNow is false and scheduledAt is missing or null', () => {
    const payload = {
      content: 'Hello World Test',
      publishNow: false,
      scheduledAt: null,
      targetPlatforms: ['LINKEDIN'],
    };
    const result = createPostSchema.body.safeParse(payload);
    assert.strictEqual(result.success, false);
    if (!result.success) {
      const issue = result.error.issues.find(i => i.path.includes('scheduledAt'));
      assert.ok(issue);
      assert.match(issue.message, /scheduledAt date string is required/);
    }
  });

  await t.test('passes when publishNow is false and valid scheduledAt ISO string is provided', () => {
    const payload = {
      content: 'Scheduled Post Test',
      publishNow: false,
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      targetPlatforms: ['LINKEDIN', 'X'],
    };
    const result = createPostSchema.body.safeParse(payload);
    assert.strictEqual(result.success, true);
  });
});
