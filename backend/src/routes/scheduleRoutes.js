import { Router } from 'express';
import {
  getDispatcherStatus,
  getUserSchedules,
  createSchedule,
  updateSchedule,
  toggleSchedule,
  deleteSchedule,
  runScheduleNow,
  toggleAdminDispatcher,
  triggerDispatcherCycle,
} from '../controllers/scheduleController.js';
import { authenticateJwt } from '../middlewares/auth.js';
import { restrictToAdmin } from '../middlewares/rbac.js';

const router = Router();

// Public / Authenticated status check
router.get('/status', getDispatcherStatus);

// Support both / and empty path for GET and POST schedules
router.get('/', authenticateJwt, getUserSchedules);
router.get('', authenticateJwt, getUserSchedules);
router.post('/', authenticateJwt, createSchedule);
router.post('', authenticateJwt, createSchedule);

router.put('/:id', authenticateJwt, updateSchedule);
router.patch('/:id/toggle', authenticateJwt, toggleSchedule);
router.delete('/:id', authenticateJwt, deleteSchedule);
router.post('/:id/run-now', authenticateJwt, runScheduleNow);

// Admin controls for dispatcher
router.post('/admin/toggle', authenticateJwt, restrictToAdmin, toggleAdminDispatcher);
router.post('/admin/trigger', authenticateJwt, restrictToAdmin, triggerDispatcherCycle);

export default router;
