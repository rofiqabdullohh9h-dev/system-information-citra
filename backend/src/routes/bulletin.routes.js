import { Router } from 'express';
import {
  getAllBulletins,
  getBulletinById,
  createBulletin,
  updateBulletin,
  deleteBulletin,
} from '../controllers/bulletinController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

// Public: Siapapun (jamaah & umum) dapat melihat daftar pengumuman & berita
router.get('/', getAllBulletins);
router.get('/:id', getBulletinById);

// Protected: Hanya pengurus terdaftar yang dapat menambah, mengubah, atau menghapus
router.post('/', authMiddleware, createBulletin);
router.put('/:id', authMiddleware, updateBulletin);
router.delete('/:id', authMiddleware, deleteBulletin);

export default router;
