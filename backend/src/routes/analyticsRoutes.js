import { Router } from 'express';
import {
  diagnosePost,
  getAudiencePeakTimes,
  getTrendingHashtags,
  getDashboardSummary,
} from '../controllers/analyticsController.js';
import { authenticateJwt } from '../middlewares/auth.js';
import { aiLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

// Public / Authenticated Virality Post Diagnosis
router.post('/diagnose-post', aiLimiter, diagnosePost);

// Authenticated Endpoints
router.use(authenticateJwt);
router.get('/audience-peak-times', getAudiencePeakTimes);
router.get('/trending-hashtags', getTrendingHashtags);
router.get('/dashboard-summary', getDashboardSummary);

export default router;
