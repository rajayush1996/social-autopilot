import defaultUploader from '../services/upload/resilientUploader.js';
import logger from '../utils/logger.js';
import { catchAsync, successResponse } from '../utils/responseHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { HttpStatus } from '../utils/httpStatus.js';

/**
 * Controller: Handle file upload (Image / Video) via Multer, routing through
 * prioritized strategies (Cloudinary -> LocalSimulation fallback).
 */
export const uploadFile = catchAsync(async (req, res) => {
  const file = req.file;

  if (!file) {
    throw ApiError.badRequest('No file uploaded in the request. Ensure field name is "file".');
  }

  logger.info(`[UploadController] Initiating resilient upload sequence for: ${file.originalname}`);

  try {
    const targetPlatform = req.body.targetPlatform || req.body.platform || 'instagram_feed';
    // Run the upload via Strategy and Fallback/Failover Pattern with compression
    const uploadResult = await defaultUploader.upload(file.buffer, file.originalname, file.mimetype, targetPlatform);

    logger.info(`[UploadController] Successful upload using strategy: "${uploadResult.strategyUsed}" (Compressed Size: ${uploadResult.size || file.size} bytes)`);

    return successResponse(res, HttpStatus.OK, 'File upload process completed.', {
      fileUrl: uploadResult.fileUrl,
      mediaType: uploadResult.mediaType,
      publicId: uploadResult.publicId,
      originalname: file.originalname,
      size: uploadResult.size || file.size,
      originalSize: uploadResult.originalSize || file.size,
      mimetype: file.mimetype,
      isMock: uploadResult.isMock,
      strategyUsed: uploadResult.strategyUsed,
    });
  } catch (err) {
    logger.error(`[UploadController] Resilient upload sequence failed: ${err.message}`);
    throw new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, `Resilient upload process failed: ${err.message}`);
  }
});

export default uploadFile;
