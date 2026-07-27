import { Server } from 'socket.io';
import { prisma } from '../config/db.js';
import logger from '../utils/logger.js';

export const SOCKET_EVENTS = Object.freeze({
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  JOIN_USER_ROOM: 'join_user_room',
  ACCOUNT_STATUS_CHANGED: 'account_status_changed',
  POST_STATUS_CHANGED: 'post_status_changed',
  AI_CREDITS_UPDATED: 'ai_credits_updated',
  SYSTEM_NOTIFICATION: 'system_notification',
  NOTIFICATION_NEW: 'notification:new',
  CHECK_PLATFORM_CONNECTION: 'check_platform_connection',
  PLATFORM_CONNECTION_STATUS: 'platform_connection_status',
});

/**
 * Enterprise SocketServerManager Class
 * Centralizes all WebSockets server events, room management, and broadcasting.
 */
export class SocketServerManager {
  constructor() {
    this.io = null;
  }

  /**
   * Initialize Socket.io server instance attached to Express HTTP server.
   */
  init(httpServer) {
    if (this.io) {
      logger.info('⚡ [SocketServerManager] Socket.io server already initialized.');
      return this.io;
    }

    this.io = new Server(httpServer, {
      cors: {
        origin: true,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['polling', 'websocket'],
    });

    this._setupListeners();
    logger.info('⚡ [SocketServerManager] Socket.io WebSocket server initialized successfully.');
    return this.io;
  }

  /**
   * Internal connection & room event setup.
   */
  _setupListeners() {
    if (!this.io) return;

    this.io.on(SOCKET_EVENTS.CONNECT, (socket) => {
      logger.info(`⚡ [SocketServerManager] Client connected: ${socket.id}`);

      socket.on(SOCKET_EVENTS.JOIN_USER_ROOM, (userId) => {
        if (userId) {
          const roomName = `user_${userId}`;
          socket.join(roomName);
          logger.info(`⚡ [SocketServerManager] Socket ${socket.id} joined room ${roomName}`);
        }
      });

      socket.on('check_platform', async (data) => {
        try {
          const rawPlatform = typeof data === 'string' ? data : data?.platform;
          const userId = data?.userId;

          if (!rawPlatform) return;

          const platformUpper = rawPlatform.toUpperCase();
          let account = null;

          if (userId) {
            account = await prisma.socialAccount.findFirst({
              where: { userId, platform: platformUpper, isActive: true },
            });
          } else {
            account = await prisma.socialAccount.findFirst({
              where: { platform: platformUpper, isActive: true },
            });
          }

          const connected = !!account;

          const payload = {
            platform: platformUpper,
            connected,
            isConnected: connected,
            username: account?.username || null,
            timestamp: new Date().toISOString(),
          };

          logger.info(`⚡ [SocketServerManager] Verified "check_platform" for "${platformUpper}": connected=${connected}`);

          socket.emit('check_platform', payload);
          socket.emit('check_platform_response', payload);
          socket.emit(SOCKET_EVENTS.PLATFORM_CONNECTION_STATUS, payload);
        } catch (err) {
          logger.error(`⚡ [SocketServerManager] Error in check_platform: ${err.message}`);
          const errorPayload = {
            platform: typeof data === 'string' ? data.toUpperCase() : data?.platform?.toUpperCase(),
            connected: false,
            isConnected: false,
            error: err.message,
          };
          socket.emit('check_platform', errorPayload);
          socket.emit('check_platform_response', errorPayload);
          socket.emit(SOCKET_EVENTS.PLATFORM_CONNECTION_STATUS, errorPayload);
        }
      });

      socket.on(SOCKET_EVENTS.CHECK_PLATFORM_CONNECTION, async (data) => {
        try {
          const rawPlatform = typeof data === 'string' ? data : data?.platform;
          const userId = data?.userId;

          if (!rawPlatform) return;

          const platformUpper = rawPlatform.toUpperCase();
          let account = null;

          if (userId) {
            account = await prisma.socialAccount.findFirst({
              where: { userId, platform: platformUpper, isActive: true },
            });
          } else {
            account = await prisma.socialAccount.findFirst({
              where: { platform: platformUpper, isActive: true },
            });
          }

          const connected = !!account;

          const payload = {
            platform: platformUpper,
            connected,
            isConnected: connected,
            username: account?.username || null,
            timestamp: new Date().toISOString(),
          };

          socket.emit('check_platform', payload);
          socket.emit('check_platform_response', payload);
          socket.emit(SOCKET_EVENTS.PLATFORM_CONNECTION_STATUS, payload);
        } catch (err) {
          logger.error(`⚡ [SocketServerManager] Error in check_platform_connection: ${err.message}`);
        }
      });

      socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
        logger.info(`⚡ [SocketServerManager] Client disconnected: ${socket.id} (Reason: ${reason})`);
      });
    });
  }

  /**
   * Get raw Socket.io Server instance
   */
  getIO() {
    return this.io;
  }

  /**
   * Broadcast Account Connection/Disconnection realtime event
   */
  emitAccountStatusChange({ userId, platform, action }) {
    if (!this.io) {
      logger.warn('⚠️ [SocketServerManager] Socket server not initialized yet.');
      return;
    }

    const payload = {
      platform: platform?.toUpperCase(),
      action, // 'CONNECTED' | 'DISCONNECTED'
      timestamp: new Date().toISOString(),
    };

    logger.info(`⚡ [SocketServerManager] Emitting "${SOCKET_EVENTS.ACCOUNT_STATUS_CHANGED}" event: ${JSON.stringify(payload)}`);

    if (userId) {
      this.io.to(`user_${userId}`).emit(SOCKET_EVENTS.ACCOUNT_STATUS_CHANGED, payload);
    }
    this.io.emit(SOCKET_EVENTS.ACCOUNT_STATUS_CHANGED, payload);
  }

  /**
   * Broadcast Post Status realtime update (Draft -> Scheduled -> Published -> Failed)
   */
  emitPostStatusChange({ userId, postId, status, details = {} }) {
    if (!this.io) return;

    const payload = {
      postId,
      status,
      details,
      timestamp: new Date().toISOString(),
    };

    logger.info(`⚡ [SocketServerManager] Emitting "${SOCKET_EVENTS.POST_STATUS_CHANGED}" event: ${JSON.stringify(payload)}`);

    if (userId) {
      this.io.to(`user_${userId}`).emit(SOCKET_EVENTS.POST_STATUS_CHANGED, payload);
    }
    this.io.emit(SOCKET_EVENTS.POST_STATUS_CHANGED, payload);
  }

  /**
   * Broadcast AI Credits Balance update
   */
  emitAiCreditsUpdate({ userId, aiCreditsRemaining }) {
    if (!this.io) return;

    const payload = {
      aiCreditsRemaining,
      timestamp: new Date().toISOString(),
    };

    logger.info(`⚡ [SocketServerManager] Emitting "${SOCKET_EVENTS.AI_CREDITS_UPDATED}" event for user ${userId}: ${JSON.stringify(payload)}`);

    if (userId) {
      this.io.to(`user_${userId}`).emit(SOCKET_EVENTS.AI_CREDITS_UPDATED, payload);
    }
  }

  /**
   * Broadcast System Push Notification ("notification:new")
   */
  emitNotification({ userId, title, message, type = 'info', id }) {
    if (!this.io) return;

    const payload = {
      id: id || `notif_${Date.now()}`,
      title,
      message,
      type,
      read: false,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    logger.info(`⚡ [SocketServerManager] Emitting "notification:new" event: ${title}`);

    if (userId) {
      this.io.to(`user_${userId}`).emit('notification:new', payload);
      this.io.to(`user_${userId}`).emit(SOCKET_EVENTS.SYSTEM_NOTIFICATION, payload);
    } else {
      this.io.emit('notification:new', payload);
      this.io.emit(SOCKET_EVENTS.SYSTEM_NOTIFICATION, payload);
    }
  }
}

// Singleton Instance
export const socketManager = new SocketServerManager();

// Backwards-Compatible Export Wrappers
export const initSocket = (httpServer) => socketManager.init(httpServer);
export const emitAccountStatusChange = (data) => socketManager.emitAccountStatusChange(data);
export const emitPostStatusChange = (data) => socketManager.emitPostStatusChange(data);
export const emitAiCreditsUpdate = (data) => socketManager.emitAiCreditsUpdate(data);
export const getIO = () => socketManager.getIO();

export default socketManager;
