import axios from 'axios';
import type { PlatformId } from '@/config/platforms';
import { toast } from '@/components/Toast';

// Get API base URL from env or default to localhost
const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const API_URL = rawApiUrl.startsWith('http://') || rawApiUrl.startsWith('https://') 
  ? rawApiUrl 
  : `https://${rawApiUrl}`;

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically inject JWT bearer token from localStorage on every request
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor: automatically refresh short-lived 3-min access token on 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/api/auth/login') &&
      !originalRequest.url?.includes('/api/auth/refresh')
    ) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      if (typeof window !== 'undefined') {
        const refreshToken = localStorage.getItem('refresh_token');

        if (!refreshToken) {
          isRefreshing = false;
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
          return Promise.reject(error);
        }

        try {
          const res = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken });
          const { token: newAccessToken, refreshToken: newRefreshToken } = res.data?.data || {};

          if (newAccessToken) {
            localStorage.setItem('auth_token', newAccessToken);
            if (newRefreshToken) {
              localStorage.setItem('refresh_token', newRefreshToken);
            }
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
            originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
            processQueue(null, newAccessToken);
            return apiClient(originalRequest);
          }
        } catch (refreshErr) {
          processQueue(refreshErr, null);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
          return Promise.reject(refreshErr);
        } finally {
          isRefreshing = false;
        }
      }
    }

    // Auto-dispatch Toast Notification on API Errors (500, 403, 404, Network error)
    if (typeof window !== 'undefined') {
      const data = error.response?.data;
      const errorMessage =
        data?.message ||
        data?.error ||
        (Array.isArray(data?.errors) ? data.errors.map((e: any) => e.msg || e.message || e).join(', ') : null) ||
        error.message ||
        'API server failed to process request. Please try again.';

      const statusCode = error.response?.status;
      const statusTitle = statusCode ? `API Error (HTTP ${statusCode})` : 'Network Connection Error';
      
      // Do not toast for cancelled requests or initial auth 401 redirects
      if (statusCode !== 401) {
        toast.error(errorMessage, statusTitle);
      }
    }

    return Promise.reject(error);
  }
);

// TypeScript interfaces for type safety
export interface User {
  id: string;
  uniqueId?: string | null;
  email: string;
  name: string | null;
  phoneNumber?: string | null;
  bio?: string | null;
  dateOfBirth?: string | null;
  avatarUrl: string | null;
  aiCredits: number;
  plan: string;
  role: string;
  allowedPlatforms?: string[];
  autopilotEnabled: boolean;
  brandContext: string | null;
  contentSummary: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SocialAccount {
  id: string;
  userId: string;
  platform: PlatformId;
  platformAccountId: string;
  username: string;
  accountName: string | null;
  accountType?: string;
  avatarUrl?: string | null;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  isPremium?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SocialPostLog {
  id: string;
  postId: string;
  socialAccountId: string | null;
  platform: PlatformId;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  externalPostId: string | null;
  externalPostUrl: string | null;
  errorMessage: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  socialAccount?: {
    username: string;
    accountName: string | null;
  } | null;
}

export interface Post {
  id: string;
  userId: string;
  content: string;
  mediaUrls: string[];
  mediaType: 'IMAGE' | 'VIDEO' | null;
  targetPlatforms: PlatformId[];
  status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED' | 'PARTIALLY_PUBLISHED' | 'CANCELLED';
  scheduledAt: string | null;
  publishedAt: string | null;
  aiGenerated: boolean;
  aiPrompt: string | null;
  tone?: string | null;
  formatStyle?: string | null;
  createdAt: string;
  updatedAt: string;
  socialPostLogs?: SocialPostLog[];
}

export interface AIGeneratePayload {
  prompt?: string;
  topic?: string;
  platform?: string;
  tone?: string;
  adaptAllPlatforms?: boolean;
  userId?: string;
}

export interface AIGeneratedResult {
  INSTAGRAM?: string;
  LINKEDIN?: string;
  X?: string;
  content?: string;
  modelUsed?: string;
  tokensUsed?: number;
  aiCreditsRemaining: number;
}

export interface UploadResponse {
  fileUrl: string;
  mediaType: 'IMAGE' | 'VIDEO';
  publicId: string;
  originalname: string;
  size: number;
  mimetype: string;
  isMock: boolean;
  strategyUsed: string;
}
