import { Router } from 'express';
import { 
  updateAutopilotSettings,
  getFeatures,
  updateFeature,
  triggerAutopilotNow
} from '../controllers/adminController.js';
import { restrictToAdmin } from '../middlewares/rbac.js';
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
 * PATCH /api/admin/features/:featureName - Toggle premium status of a feature
 */
router.patch('/features/:featureName', restrictToAdmin, updateFeature);

/**
 * POST /api/admin/autopilot/trigger - Run daily Autopilot generation
 */
router.post('/autopilot/trigger', restrictToAdmin, triggerAutopilotNow);

export default router;
