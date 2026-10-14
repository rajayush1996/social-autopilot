import AnalyticsService from '../services/analyticsService.js';
import logger from '../utils/logger.js';

export async function diagnosePost(req, res, next) {
  try {
    const { content, platform, metrics } = req.body;
    const result = await AnalyticsService.diagnosePostVirality({ content, platform, metrics });
    return res.status(200).json(result);
  } catch (error) {
    logger.error(`[AnalyticsController] diagnosePost Error: ${error.message}`);
    return next(error);
  }
}

export async function getAudiencePeakTimes(req, res, next) {
  try {
    const userId = req.user?.id;
    const platform = req.query.platform ? String(req.query.platform).toUpperCase() : undefined;
    const result = await AnalyticsService.getAudiencePeakTimes(userId, platform);
    return res.status(200).json(result);
  } catch (error) {
    logger.error(`[AnalyticsController] getAudiencePeakTimes Error: ${error.message}`);
    return next(error);
  }
}

export async function getTrendingHashtags(req, res, next) {
  try {
    const userId = req.user?.id;
    const result = await AnalyticsService.getTrendingHashtags(userId);
    return res.status(200).json(result);
  } catch (error) {
    logger.error(`[AnalyticsController] getTrendingHashtags Error: ${error.message}`);
    return next(error);
  }
}

export async function getDashboardSummary(req, res, next) {
  try {
    const userId = req.user?.id;
    const result = await AnalyticsService.getDashboardSummary(userId);
    return res.status(200).json(result);
  } catch (error) {
    logger.error(`[AnalyticsController] getDashboardSummary Error: ${error.message}`);
    return next(error);
  }
}

export async function getDetailedReport(req, res, next) {
  try {
    const userId = req.user?.id;
    const timeRange = req.query.range ? String(req.query.range).toUpperCase() : '30D';
    const platform = req.query.platform ? String(req.query.platform).toUpperCase() : 'ALL';
    const result = await AnalyticsService.getDetailedReport(userId, { timeRange, platform });
    return res.status(200).json(result);
  } catch (error) {
    logger.error(`[AnalyticsController] getDetailedReport Error: ${error.message}`);
    return next(error);
  }
}

