import { Router } from 'express';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../controllers/notificationController.js';
import { authenticateJwt } from '../middlewares/auth.js';

const router = Router();

// Secure notification endpoints
router.get('/', authenticateJwt, getNotifications);
router.patch('/read-all', authenticateJwt, markAllNotificationsRead);
router.patch('/:id/read', authenticateJwt, markNotificationRead);

export default router;
