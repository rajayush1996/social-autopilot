import { Router } from 'express';
import DashboardController from '../controllers/dashboardController.js';
import { authenticateJwt } from '../middlewares/auth.js';
import { aiLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

router.use(authenticateJwt);

// Dashboard APIs
router.get('/summary', DashboardController.getSummary);
router.get('/heatmap', DashboardController.getHeatmap);
router.get('/format-performance', DashboardController.getFormatPerformance);
router.get('/funnel', DashboardController.getFunnel);
router.post('/omni-generate', aiLimiter, DashboardController.omniGenerate);

export default router;
