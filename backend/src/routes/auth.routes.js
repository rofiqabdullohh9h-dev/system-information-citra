import { Router } from 'express';
import { login, getProfile, logout } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/login', login);
router.get('/me', authMiddleware, getProfile);
router.post('/logout', authMiddleware, logout);

export default router;
