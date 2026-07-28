import { Router } from 'express';
import { 
  updateAutopilotSettings,
  getFeatures,
  updateFeature,
  triggerAutopilotNow,
  setUserCredits,
  getPlanFeatures,
  setPlanFeatures,
} from '../controllers/adminController.js';
import { restrictToSuperAdmin } from '../middlewares/rbac.js';
import { authenticateJwt } from '../middlewares/auth.js';

const router = Router();

// Apply JWT authentication
router.use(authenticateJwt);

/**
 * POST /api/admin/settings - Save user settings (autopilot config)
 */
router.post('/settings', updateAutopilotSettings);

/**
 * GET /api/admin/features - List all feature configs
 */
router.get('/features', getFeatures);

/**
 * PATCH /api/admin/features/:featureName - Toggle premium status (Super Admin only)
 */
router.patch('/features/:featureName', restrictToSuperAdmin, updateFeature);

/**
 * POST /api/admin/autopilot/trigger - Run daily Autopilot generation (Super Admin only)
 */
router.post('/autopilot/trigger', restrictToSuperAdmin, triggerAutopilotNow);

/**
 * POST /api/admin/set-credits - Super Admin API to grant AI credits by User ID / Unique ID
 */
router.post('/set-credits', restrictToSuperAdmin, setUserCredits);
router.post('/users/:id/credits', restrictToSuperAdmin, setUserCredits);

/**
 * GET /api/admin/plan-features - Get plan feature matrix
 */
router.get('/plan-features', getPlanFeatures);

/**
 * POST /api/admin/plan-features - Super Admin update plan feature matrix
 */
router.post('/plan-features', restrictToSuperAdmin, setPlanFeatures);

export default router;
