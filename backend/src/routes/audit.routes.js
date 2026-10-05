import { Router } from 'express';
import { getAuditLogs } from '../controllers/auditController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getAuditLogs);

export default router;
