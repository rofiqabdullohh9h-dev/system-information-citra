import { Router } from 'express';
import { getOverviewStats } from '../controllers/analyticsController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/overview', getOverviewStats);

export default router;
