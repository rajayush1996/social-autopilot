import { test, describe } from 'node:test';
import assert from 'node:assert';
import PostService from '../../src/services/postService.js';
import { updatePost, deletePost } from '../../src/controllers/postController.js';

describe('📝 Post Edit & Save (PATCH/DELETE) Unit Tests', () => {

  test('updatePost controller should extract and structure valid update payload', async () => {
    let passedUpdateData = null;
    let passedPostId = null;
    let passedUserId = null;

    const originalUpdatePost = PostService.updatePost;
    const originalFindPostById = PostService.findPostById;

    try {
      PostService.findPostById = async (id, userId) => ({
        id,
        userId,
        status: 'SCHEDULED',
        content: 'Old post content',
      });

      PostService.updatePost = async (id, userId, data) => {
        passedPostId = id;
        passedUserId = userId;
        passedUpdateData = data;
        return {
          id,
          userId,
          ...data,
          updatedAt: new Date(),
        };
      };

      const req = {
        params: { id: 'test-post-uuid-1234' },
        user: { id: 'test-user-999' },
        body: {
          content: 'Updated viral hook and new caption!',
          platforms: ['LINKEDIN', 'INSTAGRAM'],
          scheduledAt: '2026-08-20T14:30:00.000Z',
        },
      };

      let responseStatus = null;
      let responseBody = null;
      const res = {
        locals: {},
        status: (code) => {
          responseStatus = code;
          return {
            json: (payload) => {
              responseBody = payload;
              return payload;
            },
          };
        },
      };

      let capturedError = null;
      const next = (err) => { capturedError = err; };

      await updatePost(req, res, next);

      if (capturedError) {
        console.error('Captured updatePost error:', capturedError);
        throw capturedError;
      }

      assert.strictEqual(passedPostId, 'test-post-uuid-1234');
      assert.strictEqual(passedUserId, 'test-user-999');
      assert.strictEqual(passedUpdateData.content, 'Updated viral hook and new caption!');
      assert.deepStrictEqual(passedUpdateData.platforms, ['LINKEDIN', 'INSTAGRAM']);
      assert.strictEqual(responseStatus, 200);
      assert.strictEqual(responseBody.success, true);
      assert.strictEqual(responseBody.data.post.content, 'Updated viral hook and new caption!');
    } finally {
      PostService.updatePost = originalUpdatePost;
      PostService.findPostById = originalFindPostById;
    }
  });

  test('deletePost controller should delete post and return success payload', async () => {
    let passedPostId = null;
    let passedUserId = null;

    const originalDeletePost = PostService.deletePost;

    try {
      PostService.deletePost = async (id, userId) => {
        passedPostId = id;
        passedUserId = userId;
        return { id, userId, status: 'DELETED' };
      };

      const req = {
        params: { id: 'post-to-delete-555' },
        user: { id: 'user-owner-888' },
      };

      let responseStatus = null;
      let responseBody = null;
      const res = {
        locals: {},
        status: (code) => {
          responseStatus = code;
          return {
            json: (payload) => {
              responseBody = payload;
              return payload;
            },
          };
        },
      };

      let capturedError = null;
      const next = (err) => { capturedError = err; };

      await deletePost(req, res, next);

      if (capturedError) throw capturedError;

      assert.strictEqual(passedPostId, 'post-to-delete-555');
      assert.strictEqual(passedUserId, 'user-owner-888');
      assert.strictEqual(responseStatus, 200);
      assert.strictEqual(responseBody.success, true);
    } finally {
      PostService.deletePost = originalDeletePost;
    }
  });
});
