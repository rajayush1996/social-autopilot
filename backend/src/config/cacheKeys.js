/**
 * Production Centralized Cache Key Registry & TTL Constants (LLD Design Pattern)
 */

export const TTL = {
  SHORT: 60,         // 1 minute (for notifications, dynamic queues)
  MEDIUM: 300,       // 5 minutes (for posts list, stats)
  LONG: 600,         // 10 minutes (for schedules list)
  VERY_LONG: 1800,   // 30 minutes (for user profiles, social accounts)
  DAY: 86400,        // 24 hours (for static feature configs)
};

export const CACHE_KEYS = {
  // User Profile & Credits
  USER_PROFILE: (userId) => `app:user:${userId}:profile`,
  
  // Auto-Pilot Schedules
  USER_SCHEDULES: (userId) => `app:user:${userId}:schedules`,
  SCHEDULE_DETAIL: (scheduleId) => `app:schedule:${scheduleId}`,
  
  // Posts & Queue History
  USER_POSTS_LIST: (userId, filter = 'ALL') => `app:user:${userId}:posts:${filter}`,
  POST_DETAIL: (postId) => `app:post:${postId}`,
  
  // Connected Social Accounts
  USER_SOCIAL_ACCOUNTS: (userId) => `app:user:${userId}:social_accounts`,
  
  // Notifications
  USER_NOTIFICATIONS: (userId) => `app:user:${userId}:notifications`,
  
  // System Feature Config
  FEATURE_CONFIG: (featureKey) => `app:system:feature:${featureKey}`,
  
  // Wildcard patterns for bulk eviction
  PATTERNS: {
    USER_ALL: (userId) => `app:user:${userId}:*`,
    USER_POSTS: (userId) => `app:user:${userId}:posts:*`,
    USER_SCHEDULES: (userId) => `app:user:${userId}:schedules*`,
    USER_NOTIFICATIONS: (userId) => `app:user:${userId}:notifications*`,
  },
};
