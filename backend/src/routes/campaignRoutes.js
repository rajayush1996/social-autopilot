import { Router } from 'express';
import { authenticateJwt } from '../middlewares/auth.js';
import { aiLimiter } from '../middlewares/rateLimiter.js';
import FluxImageService from '../services/fluxImageService.js';

const router = Router();

router.use(authenticateJwt);

// Single Flux Image Generation Endpoint
router.post('/generate-single-asset', aiLimiter, async (req, res, next) => {
  try {
    const { prompt, themeStyle = '3D_SAAS', aspectRatio = '16:9' } = req.body;
    const result = await FluxImageService.generateSingleImage({ prompt, themeStyle, aspectRatio });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
});

// Multi-Day Batch Campaign Asset Generation Endpoint
router.post('/generate-batch-assets', aiLimiter, async (req, res, next) => {
  try {
    const { totalDays = 15, themeStyle = '3D_SAAS', topicPrompt = 'SaaS Product Launch' } = req.body;
    const result = await FluxImageService.generateBatchImages({ totalDays, themeStyle, topicPrompt });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
});

export default router;
