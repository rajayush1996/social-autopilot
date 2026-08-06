import { Router } from 'express';
import {
  getUserPlaceholders,
  saveUserPlaceholders,
  createPlaceholder,
  updatePlaceholder,
  deletePlaceholder,
} from '../controllers/placeholderController.js';

const router = Router();

// GET /api/placeholders
router.get('/', getUserPlaceholders);
router.get('', getUserPlaceholders);

// POST /api/placeholders
router.post('/', saveUserPlaceholders);
router.post('', saveUserPlaceholders);

// PUT /api/placeholders/:id
router.put('/:id', updatePlaceholder);

// DELETE /api/placeholders/:id
router.delete('/:id', deletePlaceholder);

export default router;
