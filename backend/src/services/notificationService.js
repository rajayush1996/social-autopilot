import { prisma } from '../config/db.js';
import socketManager from './socketService.js';
import logger from '../utils/logger.js';

/**
 * Enterprise Notification Service
 * Handles persistent notification storage and real-time WebSocket delivery.
 */
export class NotificationService {
  /**
   * Create & store a notification in database, and broadcast via Socket.io
   */
  static async createNotification({ userId, title, message, type = 'info' }) {
    try {
      let notification = null;

      if (userId) {
        notification = await prisma.notification.create({
          data: {
            userId,
            title,
            message,
            type,
            read: false,
          },
        });
      }

      const payload = {
        id: notification?.id || `notif_${Date.now()}`,
        title,
        message,
        type,
        read: false,
        createdAt: notification?.createdAt || new Date().toISOString(),
      };

      // Emit realtime socket event
      socketManager.emitNotification({ userId, title, message, type });

      logger.info(`🔔 [NotificationService] Notification created & emitted for user ${userId || 'all'}: "${title}"`);
      return payload;
    } catch (err) {
      logger.error(`🔔 [NotificationService] Error creating notification: ${err.message}`);
      // Fallback socket broadcast if db save fails
      socketManager.emitNotification({ userId, title, message, type });
      return null;
    }
  }

  /**
   * Get user notifications and unread count
   */
  static async getUserNotifications(userId) {
    try {
      const notifications = await prisma.notification.findMany({
        where: userId ? { userId } : {},
        orderBy: { createdAt: 'desc' },
        take: 30,
      });

      const unreadCount = await prisma.notification.count({
        where: userId ? { userId, read: false } : { read: false },
      });

      return {
        notifications,
        unreadCount,
      };
    } catch (err) {
      logger.error(`🔔 [NotificationService] Error fetching notifications: ${err.message}`);
      return { notifications: [], unreadCount: 0 };
    }
  }

  /**
   * Mark a single notification as read
   */
  static async markAsRead(notificationId, userId) {
    try {
      const updated = await prisma.notification.updateMany({
        where: userId ? { id: notificationId, userId } : { id: notificationId },
        data: { read: true },
      });
      return updated.count > 0;
    } catch (err) {
      logger.error(`🔔 [NotificationService] Error marking notification as read: ${err.message}`);
      return false;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId) {
    try {
      const updated = await prisma.notification.updateMany({
        where: userId ? { userId, read: false } : { read: false },
        data: { read: true },
      });
      return updated.count;
    } catch (err) {
      logger.error(`🔔 [NotificationService] Error marking all notifications as read: ${err.message}`);
      return 0;
    }
  }
}

export default NotificationService;
