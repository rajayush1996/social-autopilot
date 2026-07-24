import { describe, it } from 'node:test';
import assert from 'node:assert';
import { listPosts } from '../../src/controllers/postController.js';

describe('Post Controller Unit Tests', () => {
  it('should export listPosts function', () => {
    assert.strictEqual(typeof listPosts, 'function');
  });
});
