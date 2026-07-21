import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ApiError } from '../../src/utils/ApiError.js';
import { HttpStatus } from '../../src/utils/httpStatus.js';

describe('Utility & Error Class Unit Tests', () => {
  it('should instantiate ApiError with status codes and properties', () => {
    const err = ApiError.badRequest('Invalid request body parameter');
    assert.strictEqual(err.statusCode, HttpStatus.BAD_REQUEST);
    assert.strictEqual(err.message, 'Invalid request body parameter');
    assert.strictEqual(err.isOperational, true);
  });

  it('should instantiate ApiError.notFound correctly', () => {
    const err = ApiError.notFound('Resource not found');
    assert.strictEqual(err.statusCode, HttpStatus.NOT_FOUND);
    assert.strictEqual(err.message, 'Resource not found');
  });

  it('should instantiate ApiError.unauthorized correctly', () => {
    const err = ApiError.unauthorized('Unauthorized access');
    assert.strictEqual(err.statusCode, HttpStatus.UNAUTHORIZED);
    assert.strictEqual(err.message, 'Unauthorized access');
  });
});
