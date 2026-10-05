import { Router } from 'express';
import {
  getAllJamaah,
  getJamaahById,
  createJamaah,
  updateJamaah,
  deleteJamaah,
  bulkImportJamaah,
} from '../controllers/jamaahController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

// Read access for jamaah directory
router.get('/', getAllJamaah);
router.get('/:id', getJamaahById);

// Authenticated mutations for Pengurus only
router.use(authMiddleware);
router.post('/', createJamaah);
router.put('/:id', updateJamaah);
router.delete('/:id', deleteJamaah);
router.post('/bulk-import', bulkImportJamaah);

export default router;

