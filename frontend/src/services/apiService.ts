import { apiClient, User, SocialAccount, Post, AIGeneratePayload, AIGeneratedResult, UploadResponse } from '@/lib/api';
import CONFIG from '@/config';
import { API_ENDPOINTS } from '@/config/constants';
import type { PlatformId } from '@/config/platforms';

export interface FeatureConfig {
  id: string;
  feature: string;
  isPremium: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationSchedule {
  id: string;
  userId: string;
  name: string;
  daysOfWeek: string[];
  timeOfDay: string;
  timezone: string;
  repeatType: string;
  isActive: boolean;
  targetPlatforms: PlatformId[];
  tone: string;
  topicPrompt?: string;
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * ApiService
 * Encapsulates all backend HTTP interactions. Zero hardcoded paths or parameters in components.
 */
export class ApiService {
  /**
   * Fetch system dispatcher status (Admin setting check)
   */
  static async getDispatcherStatus(): Promise<{ dispatcherEnabled: boolean }> {
    const response = await apiClient.get(API_ENDPOINTS.DISPATCHER_STATUS);
    return response.data?.data || { dispatcherEnabled: false };
  }

  /**
   * Fetch all user automation schedules
   */
  static async getUserSchedules(): Promise<{ dispatcherEnabled: boolean; schedules: AutomationSchedule[] }> {
    const response = await apiClient.get(API_ENDPOINTS.SCHEDULES);
    return {
      dispatcherEnabled: response.data?.data?.dispatcherEnabled ?? true,
      schedules: response.data?.data?.schedules || [],
    };
  }

  /**
   * Create a new alarm-style automation schedule
   */
  static async createSchedule(payload: Partial<AutomationSchedule>): Promise<AutomationSchedule> {
    const response = await apiClient.post(API_ENDPOINTS.SCHEDULES, payload);
    return response.data?.data?.schedule;
  }

  /**
   * Update an existing schedule
   */
  static async updateSchedule(id: string, payload: Partial<AutomationSchedule>): Promise<AutomationSchedule> {
    const response = await apiClient.put(`${API_ENDPOINTS.SCHEDULES}/${id}`, payload);
    return response.data?.data?.schedule;
  }

  /**
   * Quick toggle schedule active state (Alarm switch)
   */
  static async toggleSchedule(id: string, isActive?: boolean): Promise<AutomationSchedule> {
    const response = await apiClient.patch(API_ENDPOINTS.TOGGLE_SCHEDULE(id), { isActive });
    return response.data?.data?.schedule;
  }

  /**
   * Delete schedule
   */
  static async deleteSchedule(id: string): Promise<void> {
    await apiClient.delete(`${API_ENDPOINTS.SCHEDULES}/${id}`);
  }

  /**
   * Trigger immediate execution of a specific schedule
   */
  static async runScheduleNow(id: string, updateExistingPostId?: string): Promise<any> {
    const response = await apiClient.post(API_ENDPOINTS.RUN_SCHEDULE_NOW(id), { updateExistingPostId });
    return response.data?.data;
  }

  /**
   * Admin: Toggle global Scheduling Dispatcher status
   */
  static async setAdminDispatcherStatus(enabled: boolean): Promise<boolean> {
    const response = await apiClient.post(API_ENDPOINTS.ADMIN_TOGGLE_DISPATCHER, { enabled });
    return response.data?.data?.dispatcherEnabled ?? enabled;
  }

  /**
   * Admin: Trigger full dispatcher execution cycle
   */
  static async triggerDispatcherCycle(): Promise<any> {
    const response = await apiClient.post(API_ENDPOINTS.ADMIN_TRIGGER_DISPATCHER);
    return response.data?.data;
  }


  /**
   * Fetch user profile details (credits, plan, autopilot settings)
   */
  static async getUserProfile(userId: string = 'me'): Promise<User> {
    const response = await apiClient.get(API_ENDPOINTS.USER_PROFILE(userId));
    return response.data?.data?.user;
  }

  /**
   * Update user plan (mock subscription plan billing changes)
   */
  static async updateUserPlan(userId: string, plan: 'FREE' | 'PREMIUM'): Promise<User> {
    const response = await apiClient.patch(API_ENDPOINTS.UPDATE_PLAN(userId), { plan });
    return response.data?.data?.user;
  }

  /**
   * Update user role (mock RBAC testing helper)
   */
  static async updateUserRole(userId: string, role: 'USER' | 'ADMIN'): Promise<User> {
    const response = await apiClient.patch(API_ENDPOINTS.UPDATE_ROLE(userId), { role });
    return response.data?.data?.user;
  }

  /**
   * Fetch connected social media accounts for a user
   */
  static async getConnectedAccounts(userId?: string): Promise<SocialAccount[]> {
    const url = userId ? `${API_ENDPOINTS.GET_ACCOUNTS}?userId=${userId}` : API_ENDPOINTS.GET_ACCOUNTS;
    const response = await apiClient.get(url);
    return response.data?.data?.accounts || [];
  }

  /**
   * Generate platform OAuth authorization redirect URL
   */
  static async getOAuthUrl(platform: PlatformId): Promise<string> {
    const response = await apiClient.get(`${API_ENDPOINTS.OAUTH_REDIRECT_URL}?platform=${platform}`);
    return response.data?.data?.authUrl;
  }

  /**
   * Disconnect a linked social account
   */
  static async disconnectAccount(accountId: string): Promise<SocialAccount> {
    const response = await apiClient.delete(API_ENDPOINTS.DISCONNECT_ACCOUNT(accountId));
    return response.data?.data?.account;
  }

  /**
   * Connect a mock profile directly (Simulation mode helper)
   */
  static async connectMockAccount(platform: string, username: string, accountType: string = 'PERSONAL', avatarUrl?: string): Promise<SocialAccount> {
    const response = await apiClient.post(API_ENDPOINTS.CONNECT_ACCOUNT, {
      platform,
      username,
      accountType,
      avatarUrl,
    });
    return response.data?.data?.account;
  }

  /**
   * Upload image or video with real-time upload progress tracking and target platform compression
   */
  static async uploadMedia(
    file: File,
    onProgress?: (percent: number) => void,
    targetPlatform: string = 'instagram_feed'
  ): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetPlatform', targetPlatform);
    const response = await apiClient.post(API_ENDPOINTS.UPLOAD_MEDIA, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          if (onProgress) onProgress(percent);
        }
      },
    });
    return response.data?.data;
  }

  /**
   * Generate post content optimized for social platforms using AI
   */
  static async generateAiContent(
    prompt: string, 
    tone: string, 
    platforms?: string[],
    options?: {
      emojiDensity?: string;
      hashtagCount?: string;
      formatStyle?: string;
      contentLength?: string;
      articleUrl?: string;
    }
  ): Promise<AIGeneratedResult> {
    const payload = {
      prompt,
      tone,
      platforms: platforms || ['INSTAGRAM', 'LINKEDIN', 'X'],
      targetPlatforms: platforms || ['INSTAGRAM', 'LINKEDIN', 'X'],
      adaptAllPlatforms: true,
      emojiDensity: options?.emojiDensity || 'MEDIUM',
      hashtagCount: options?.hashtagCount || 'MODERATE',
      formatStyle: options?.formatStyle || 'SINGLE',
      contentLength: options?.contentLength || 'BALANCED',
      articleUrl: options?.articleUrl || '',
    };
    const response = await apiClient.post(API_ENDPOINTS.AI_GENERATE, payload);
    return response.data?.data;
  }

  /**
   * Magic AI Prompt Enhancer: Expands a raw 2-3 word thought into an optimized prompt
   */
  static async enhancePrompt(rawThought: string, platform: string = 'GENERAL', tone: string = 'ENGAGING'): Promise<{ enhancedPrompt: string; originalThought: string }> {
    const response = await apiClient.post('/api/posts/enhance-prompt', {
      rawThought,
      platform,
      tone,
    });
    return response.data?.data || { enhancedPrompt: rawThought, originalThought: rawThought };
  }

  /**
   * Fetch list of posts in the system
   */
  static async getPosts(userId?: string): Promise<Post[]> {
    const url = userId ? `${API_ENDPOINTS.POSTS}?limit=100&userId=${userId}` : `${API_ENDPOINTS.POSTS}?limit=100`;
    const response = await apiClient.get(url);
    return response.data?.data?.posts || [];
  }

  /**
   * Create or schedule a new post
   */
  static async createPost(payload: {
    userId?: string;
    content: string;
    mediaUrls?: string[];
    mediaType?: 'IMAGE' | 'VIDEO' | null;
    targetPlatforms: PlatformId[];
    scheduledAt?: string | null;
    publishNow: boolean;
  }): Promise<Post> {
    const response = await apiClient.post(API_ENDPOINTS.POSTS, payload);
    return response.data?.data?.post;
  }

  /**
   * Cancel scheduled publication post
   */
  static async cancelPost(postId: string): Promise<Post> {
    const response = await apiClient.patch(API_ENDPOINTS.CANCEL_POST(postId));
    return response.data?.data?.post;
  }

  /**
   * Retry / Republish a failed post
   */
  static async retryPost(postId: string): Promise<any> {
    const response = await apiClient.post(`/api/posts/${postId}/retry`);
    return response.data?.data;
  }

  /**
   * Update an existing post (content, media, or status)
   */
  static async updatePost(postId: string, data: any): Promise<any> {
    try {
      const response = await apiClient.patch(`/api/posts/${postId}`, data);
      return response.data?.data?.post || response.data?.data;
    } catch (err: any) {
      return data;
    }
  }

  /**
   * Publish a post immediately
   */
  static async publishPost(postId: string): Promise<any> {
    const response = await apiClient.post(`/api/posts/${postId}/retry`);
    return response.data?.data;
  }

  /**
   * Delete a post from queue
   */
  static async deletePost(postId: string): Promise<any> {
    try {
      const response = await apiClient.delete(`/api/posts/${postId}`);
      return response.data?.data;
    } catch (err: any) {
      const response = await apiClient.patch(`/api/posts/${postId}/cancel`);
      return response.data?.data;
    }
  }

  /**
   * Manually trigger overdue posts synchronization
   */
  static async triggerSchedulerSync(): Promise<any> {
    const response = await apiClient.post(API_ENDPOINTS.TRIGGER_SCHEDULER);
    return response.data?.data;
  }

  // --- Admin & Autopilot API integration ---

  /**
   * Update autopilot toggle and context settings for a user
   */
  static async updateAutopilotSettings(payload: {
    userId: string;
    autopilotEnabled: boolean;
    brandContext: string;
  }): Promise<any> {
    const response = await apiClient.post(API_ENDPOINTS.UPDATE_SETTINGS, payload);
    return response.data?.data;
  }

  /**
   * Fetch all features configured in admin settings
   */
  static async getFeatures(): Promise<FeatureConfig[]> {
    const response = await apiClient.get(API_ENDPOINTS.GET_FEATURES);
    return response.data?.data?.features || [];
  }

  /**
   * Toggle isPremium flag for a specific feature (Admin control)
   */
  static async updateFeaturePremium(featureName: string, isPremium: boolean): Promise<FeatureConfig> {
    const response = await apiClient.patch(API_ENDPOINTS.UPDATE_FEATURE(featureName), { isPremium });
    return response.data?.data?.feature;
  }

  /**
   * Manually execute the daily Autopilot generation cycle immediately (Admin control)
   */
  static async triggerAutopilotCycle(): Promise<any> {
    const response = await apiClient.post(API_ENDPOINTS.TRIGGER_AUTOPILOT);
    return response.data?.data?.reports || [];
  }

  // --- User Authentication integration ---

  /**
   * Register a new user profile
   */
  static async register(payload: any): Promise<any> {
    const response = await apiClient.post(API_ENDPOINTS.REGISTER, payload);
    return response.data?.data;
  }

  /**
   * Authenticate credentials and return JWT token
   */
  static async login(payload: any): Promise<any> {
    const response = await apiClient.post(API_ENDPOINTS.LOGIN, payload);
    return response.data?.data;
  }

  /**
   * Fetch persistent user notifications & unread count
   */
  static async getNotifications(): Promise<{ notifications: any[]; unreadCount: number }> {
    try {
      const response = await apiClient.get('/api/notifications');
      return response.data?.data || { notifications: [], unreadCount: 0 };
    } catch (e) {
      return { notifications: [], unreadCount: 0 };
    }
  }

  /**
   * Mark a notification as read
   */
  static async markNotificationRead(id: string): Promise<boolean> {
    try {
      await apiClient.patch(`/api/notifications/${id}/read`);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllNotificationsRead(): Promise<boolean> {
    try {
      await apiClient.patch('/api/notifications/read-all');
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Fetch currently authenticated user session details
   */
  static async getMe(): Promise<User> {
    const response = await apiClient.get(API_ENDPOINTS.ME);
    return response.data?.data?.user;
  }

  /**
   * Update Profile Details (Avatar, Phone, Bio, Date of Birth)
   */
  static async updateUserProfile(payload: {
    name?: string;
    phoneNumber?: string;
    bio?: string;
    dateOfBirth?: string;
    avatarUrl?: string;
  }): Promise<User> {
    const response = await apiClient.patch('/api/auth/me', payload);
    return response.data?.data?.user;
  }

  /**
   * Super Admin: Grant / set AI credits by User ID or Unique Tag ID
   */
  static async grantUserCredits(payload: {
    uniqueId?: string;
    targetUserId?: string;
    freeCreditValue: number;
  }): Promise<any> {
    const response = await apiClient.post('/api/admin/set-credits', payload);
    return response.data?.data;
  }

  /**
   * Fetch plan feature matrix (Allowed platforms per plan)
   */
  static async getPlanFeatures(): Promise<Record<string, { allowedPlatforms: string[]; maxAiCredits?: number }>> {
    try {
      const response = await apiClient.get('/api/admin/plan-features');
      return response.data?.data?.matrix;
    } catch (e) {
      return {
        FREE: { allowedPlatforms: ['INSTAGRAM', 'LINKEDIN'], maxAiCredits: 15 },
        PRO: { allowedPlatforms: ['INSTAGRAM', 'LINKEDIN', 'X'], maxAiCredits: 500 },
        ENTERPRISE: { allowedPlatforms: ['INSTAGRAM', 'LINKEDIN', 'X'], maxAiCredits: 9999 },
      };
    }
  }

  /**
   * Super Admin: Update plan feature matrix
   */
  static async setPlanFeatures(matrix: Record<string, any>): Promise<any> {
    const response = await apiClient.post('/api/admin/plan-features', { matrix });
    return response.data?.data;
  }
}

export default ApiService;
