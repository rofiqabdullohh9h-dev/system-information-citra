import { Router } from 'express';
import {
  getAllAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  toggleAdminStatus,
  resetDatabase,
} from '../controllers/adminController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getAllAdmins);
router.post('/', createAdmin);
router.put('/:id', updateAdmin);
router.delete('/:id', deleteAdmin);
router.patch('/:id/toggle-status', toggleAdminStatus);
router.post('/reset-data', resetDatabase);

export default router;

