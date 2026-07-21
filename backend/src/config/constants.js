/**
 * Centralized Application Constants & Status Flags.
 * Freezes status enums and platform keys to prevent magic string typos across the codebase.
 */

export const SOCIAL_PLATFORM = Object.freeze({
  INSTAGRAM: 'INSTAGRAM',
  LINKEDIN: 'LINKEDIN',
  X: 'X',
});

export const POST_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  SCHEDULED: 'SCHEDULED',
  PUBLISHING: 'PUBLISHING',
  PUBLISHED: 'PUBLISHED',
  FAILED: 'FAILED',
  PARTIALLY_PUBLISHED: 'PARTIALLY_PUBLISHED',
  CANCELLED: 'CANCELLED',
});

export const SOCIAL_POST_STATUS = Object.freeze({
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
});

export const AI_TONE = Object.freeze({
  PROFESSIONAL: 'PROFESSIONAL',
  CASUAL: 'CASUAL',
  ENGAGING: 'ENGAGING',
  EDUCATIONAL: 'EDUCATIONAL',
  PROMOTIONAL: 'PROMOTIONAL',
  HUMOROUS: 'HUMOROUS',
});

export const QUEUE_CONFIG = Object.freeze({
  POST_QUEUE_NAME: 'social-post-queue',
  PUBLISH_JOB_NAME: 'publish-post-job',
});

export default {
  SOCIAL_PLATFORM,
  POST_STATUS,
  SOCIAL_POST_STATUS,
  AI_TONE,
  QUEUE_CONFIG,
};
