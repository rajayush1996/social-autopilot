import { io, Socket } from 'socket.io-client';
import CONFIG from '@/config';
import accountEvents from './accountEvents';

export interface AccountStatusPayload {
  platform: string;
  action: 'CONNECTED' | 'DISCONNECTED';
  timestamp?: string;
}

export interface PostStatusPayload {
  postId: string;
  status: string;
  details?: any;
  timestamp?: string;
}

export interface AiCreditsPayload {
  aiCreditsRemaining: number;
  timestamp?: string;
}

export interface SystemNotificationPayload {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp?: string;
}

export interface PlatformConnectionStatusPayload {
  platform: string;
  isConnected: boolean;
  username?: string;
  timestamp?: string;
}

export const SOCKET_EVENTS = Object.freeze({
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  JOIN_USER_ROOM: 'join_user_room',
  ACCOUNT_STATUS_CHANGED: 'account_status_changed',
  POST_STATUS_CHANGED: 'post_status_changed',
  AI_CREDITS_UPDATED: 'ai_credits_updated',
  SYSTEM_NOTIFICATION: 'system_notification',
  CHECK_PLATFORM_CONNECTION: 'check_platform_connection',
  PLATFORM_CONNECTION_STATUS: 'platform_connection_status',
});

/**
 * Enterprise SocketClientManager Class (Frontend Singleton Manager)
 * Centralizes all WebSockets connections, strongly typed event listeners, and room joins.
 */
export class SocketClientManager {
  private socket: Socket | null = null;
  private isConnected: boolean = false;

  constructor() {
    // Lazy initialization on client side
  }

  /**
   * Returns or initializes the active Socket.io instance.
   */
  public connect(): Socket | null {
    if (typeof window === 'undefined') return null;

    if (!this.socket) {
      let socketUrl = CONFIG.API_URL || 'http://localhost:5000';
      if (socketUrl.endsWith('/api')) {
        socketUrl = socketUrl.replace(/\/api$/, '');
      }
      if (!socketUrl || socketUrl === '/' || socketUrl.includes(':3000')) {
        socketUrl = 'http://localhost:5000';
      }

      console.log('⚡ [SocketClientManager] Connecting to Express Backend WebSocket server at:', socketUrl);

      this.socket = io(socketUrl, {
        transports: ['polling', 'websocket'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 20,
        reconnectionDelay: 1000,
        withCredentials: true,
      });

      this._registerBaseListeners();
    }

    return this.socket;
  }

  private _registerBaseListeners() {
    if (!this.socket) return;

    this.socket.on(SOCKET_EVENTS.CONNECT, () => {
      this.isConnected = true;
      console.log('⚡ [SocketClientManager] Connected cleanly with Socket ID:', this.socket?.id);

      const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null;
      if (userId) {
        this.joinUserRoom(userId);
      }
    });

    this.socket.on(SOCKET_EVENTS.ACCOUNT_STATUS_CHANGED, (data: AccountStatusPayload) => {
      console.log('⚡ [SocketClientManager] Event received: account_status_changed', data);
      accountEvents.notifyAccountChange(data.action, data.platform);
    });

    this.socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
      this.isConnected = false;
      console.log('⚡ [SocketClientManager] Disconnected:', reason);
    });

    this.socket.on('connect_error', (err) => {
      console.warn('⚡ [SocketClientManager] Connection notice:', err.message);
    });
  }

  /**
   * Join private user room for targeted socket updates.
   */
  public joinUserRoom(userId: string) {
    if (this.socket && userId) {
      this.socket.emit(SOCKET_EVENTS.JOIN_USER_ROOM, userId);
    }
  }

  /**
   * Subscribe to Account Status Changed events.
   * Returns cleanup unsubscribe function.
   */
  public onAccountStatusChange(callback: (data: AccountStatusPayload) => void): () => void {
    const socket = this.connect();
    if (!socket) return () => {};

    socket.on(SOCKET_EVENTS.ACCOUNT_STATUS_CHANGED, callback);
    return () => {
      socket.off(SOCKET_EVENTS.ACCOUNT_STATUS_CHANGED, callback);
    };
  }

  /**
   * Subscribe to Post Status Changed events.
   * Returns cleanup unsubscribe function.
   */
  public onPostStatusChange(callback: (data: PostStatusPayload) => void): () => void {
    const socket = this.connect();
    if (!socket) return () => {};

    socket.on(SOCKET_EVENTS.POST_STATUS_CHANGED, callback);
    return () => {
      socket.off(SOCKET_EVENTS.POST_STATUS_CHANGED, callback);
    };
  }

  /**
   * Subscribe to AI Credits updates.
   * Returns cleanup unsubscribe function.
   */
  public onAiCreditsUpdate(callback: (data: AiCreditsPayload) => void): () => void {
    const socket = this.connect();
    if (!socket) return () => {};

    socket.on(SOCKET_EVENTS.AI_CREDITS_UPDATED, callback);
    return () => {
      socket.off(SOCKET_EVENTS.AI_CREDITS_UPDATED, callback);
    };
  }

  /**
   * Subscribe to System Push Notifications.
   * Returns cleanup unsubscribe function.
   */
  public onNotification(callback: (data: SystemNotificationPayload) => void): () => void {
    const socket = this.connect();
    if (!socket) return () => {};

    socket.on(SOCKET_EVENTS.SYSTEM_NOTIFICATION, callback);
    return () => {
      socket.off(SOCKET_EVENTS.SYSTEM_NOTIFICATION, callback);
    };
  }

  /**
   * Send realtime WebSocket request to check if a specific platform is connected.
   * Event: "check_platform" -> Payload: { platform: "LINKEDIN" }
   */
  public checkPlatform(platform: string, userId?: string) {
    const socket = this.connect();
    if (socket) {
      socket.emit('check_platform', { platform, userId });
    }
  }

  public checkPlatformConnection(platform: string, userId?: string) {
    this.checkPlatform(platform, userId);
  }

  /**
   * Subscribe to "check_platform" response from backend ({ platform: "LINKEDIN", connected: true|false }).
   */
  public onPlatformCheck(callback: (data: { platform: string; connected: boolean; isConnected: boolean; username?: string }) => void): () => void {
    const socket = this.connect();
    if (!socket) return () => {};

    socket.on('check_platform', callback);
    socket.on('check_platform_response', callback);
    socket.on(SOCKET_EVENTS.PLATFORM_CONNECTION_STATUS, callback as any);

    return () => {
      socket.off('check_platform', callback);
      socket.off('check_platform_response', callback);
      socket.off(SOCKET_EVENTS.PLATFORM_CONNECTION_STATUS, callback as any);
    };
  }

  public onPlatformConnectionStatus(callback: (data: PlatformConnectionStatusPayload) => void): () => void {
    return this.onPlatformCheck(callback as any);
  }

  /**
   * Emit custom socket event to backend.
   */
  public emit(eventName: string, data?: any) {
    const socket = this.connect();
    if (socket) {
      socket.emit(eventName, data);
    }
  }

  /**
   * Disconnect socket instance.
   */
  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  public getSocket(): Socket | null {
    return this.socket || this.connect();
  }
}

// Singleton Instance
export const socketClient = new SocketClientManager();

// Backwards-Compatible Function Export
export function getSocket(): Socket | null {
  return socketClient.connect();
}

export default socketClient;
