import { Router } from 'express';
import {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

// Public read access for category labels
router.get('/', getAllCategories);

// Authenticated mutations for Pengurus only
router.use(authMiddleware);
router.post('/', createCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);


export default router;
