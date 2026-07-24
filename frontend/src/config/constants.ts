/**
 * Unified application constants.
 * Prevents magic strings and hardcoded endpoint paths across the workspace.
 */

export const API_ENDPOINTS = {
  USER_PROFILE: (id: string) => `/api/auth/user/${id}`,
  UPDATE_PLAN: (id: string) => `/api/auth/user/${id}/plan`,
  UPDATE_ROLE: (id: string) => `/api/auth/user/${id}/role`,
  GET_ACCOUNTS: `/api/auth/accounts`,
  OAUTH_REDIRECT_URL: `/api/auth/url`,
  DISCONNECT_ACCOUNT: (id: string) => `/api/auth/accounts/${id}`,
  CONNECT_ACCOUNT: `/api/auth/connect`,
  UPLOAD_MEDIA: `/api/upload`,
  AI_GENERATE: `/api/posts/ai-generate`,
  POSTS: `/api/posts`,
  CANCEL_POST: (id: string) => `/api/posts/${id}/cancel`,
  TRIGGER_SCHEDULER: `/api/posts/trigger-scheduler`,
  
  // Admin & Autopilot Settings endpoints
  UPDATE_SETTINGS: `/api/admin/settings`,
  GET_FEATURES: `/api/admin/features`,
  UPDATE_FEATURE: (name: string) => `/api/admin/features/${name}`,
  TRIGGER_AUTOPILOT: `/api/admin/autopilot/trigger`,

  // Authentication endpoints
  REGISTER: `/api/auth/register`,
  LOGIN: `/api/auth/login`,
  ME: `/api/auth/me`,

  // Scheduling Dispatcher endpoints
  DISPATCHER_STATUS: `/api/schedules/status`,
  SCHEDULES: `/api/schedules`,
  TOGGLE_SCHEDULE: (id: string) => `/api/schedules/${id}/toggle`,
  RUN_SCHEDULE_NOW: (id: string) => `/api/schedules/${id}/run-now`,
  ADMIN_TOGGLE_DISPATCHER: `/api/schedules/admin/toggle`,
  ADMIN_TRIGGER_DISPATCHER: `/api/schedules/admin/trigger`,
};

export const SOCIAL_PLATFORMS = {
  INSTAGRAM: 'INSTAGRAM',
  LINKEDIN: 'LINKEDIN',
  X: 'X',
} as const;

export const POST_TONES = {
  ENGAGING: 'ENGAGING',
  PROFESSIONAL: 'PROFESSIONAL',
  CASUAL: 'CASUAL',
  HUMOROUS: 'HUMOROUS',
  PROMOTIONAL: 'PROMOTIONAL',
} as const;

export const POST_STATUS = {
  DRAFT: 'DRAFT',
  SCHEDULED: 'SCHEDULED',
  PUBLISHED: 'PUBLISHED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;
