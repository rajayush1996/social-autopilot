import { Router } from 'express';
import multer from 'multer';
import { uploadFile } from '../controllers/uploadController.js';

const router = Router();

// Configure Multer with memory storage (50MB max file size for images/videos)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Only image and video files are supported.'));
    }
  },
});

/**
 * POST /api/upload - Direct Image and Video Upload Endpoint
 */
router.post('/', upload.single('file'), uploadFile);

export default router;
