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

export const UPLOAD_CONFIG = Object.freeze({
  MAX_FILE_SIZE_BYTES: 100 * 1024 * 1024, // 100 MB
  DEFAULT_BUCKET_NAME: 'postpilot',
  JPEG_QUALITY: 85,
  DEFAULT_REGION: 'auto',
  VIDEO_MAX_BITRATE: '5000k',
  VIDEO_BUF_SIZE: '10000k',
  VIDEO_CODEC: 'libx264',
  AUDIO_CODEC: 'aac',
  PIX_FMT: 'yuv420p',
});

export const TARGET_PLATFORM = Object.freeze({
  INSTAGRAM_REEL: 'instagram_reel',
  INSTAGRAM_FEED: 'instagram_feed',
  LINKEDIN: 'linkedin',
  TWITTER: 'twitter',
  X: 'x',
});

export const PLATFORM_IMAGE_DIMENSIONS = Object.freeze({
  INSTAGRAM_REEL: Object.freeze({ width: 1080, height: 1920, fit: 'cover', position: 'center' }),
  INSTAGRAM_FEED: Object.freeze({ width: 1080, height: 1350, fit: 'cover', position: 'center' }),
  LANDSCAPE_SAFE: Object.freeze({ width: 1920, height: 1080, fit: 'inside', withoutEnlargement: true }),
  DEFAULT_SAFE: Object.freeze({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true }),
});

export const PLATFORM_VIDEO_SCALING = Object.freeze({
  INSTAGRAM_REEL: 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920',
  SQUARE_FEED: 'scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080',
  LANDSCAPE_FEED: 'scale=1920:1080:force_original_aspect_ratio=decrease',
});

export default {
  SOCIAL_PLATFORM,
  POST_STATUS,
  SOCIAL_POST_STATUS,
  AI_TONE,
  QUEUE_CONFIG,
  UPLOAD_CONFIG,
  TARGET_PLATFORM,
  PLATFORM_IMAGE_DIMENSIONS,
  PLATFORM_VIDEO_SCALING,
};
