import { Server } from 'socket.io';
import logger from '../utils/logger.js';

let io = null;

/**
 * Initialize Socket.io WebSocket server attached to HTTP Server
 */
export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: true,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['polling', 'websocket'],
  });

  io.on('connection', (socket) => {
    logger.info(`⚡ [Socket.io] Client connected: ${socket.id}`);

    socket.on('join_user_room', (userId) => {
      if (userId) {
        socket.join(`user_${userId}`);
        logger.info(`⚡ [Socket.io] Socket ${socket.id} joined room user_${userId}`);
      }
    });

    socket.on('disconnect', () => {
      logger.info(`⚡ [Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Emit realtime event to connected client sockets
 */
export function emitAccountStatusChange({ userId, platform, action }) {
  if (!io) {
    logger.warn('⚠️ [Socket.io] Socket server not initialized yet.');
    return;
  }

  const payload = {
    platform,
    action, // 'CONNECTED' | 'DISCONNECTED'
    timestamp: new Date().toISOString(),
  };

  logger.info(`⚡ [Socket.io] Emitting "account_status_changed" event for user ${userId || 'all'}: ${JSON.stringify(payload)}`);

  if (userId) {
    io.to(`user_${userId}`).emit('account_status_changed', payload);
  }
  // Also broadcast globally so all open client tabs receive the realtime socket event immediately
  io.emit('account_status_changed', payload);
}

export function getIO() {
  return io;
}

export default { initSocket, emitAccountStatusChange, getIO };
