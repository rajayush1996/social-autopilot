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
    // Run the upload via Strategy and Fallback/Failover Pattern
    const uploadResult = await defaultUploader.upload(file.buffer, file.originalname, file.mimetype);

    logger.info(`[UploadController] Successful upload result using strategy: "${uploadResult.strategyUsed}"`);

    return successResponse(res, HttpStatus.OK, 'File upload process completed.', {
      fileUrl: uploadResult.fileUrl,
      mediaType: uploadResult.mediaType,
      publicId: uploadResult.publicId,
      originalname: file.originalname,
      size: file.size,
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
