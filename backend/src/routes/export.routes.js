import { Router } from 'express';
import { exportAttendanceToExcel } from '../controllers/exportController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/excel/:eventId', exportAttendanceToExcel);
router.get('/attendance/:eventId', exportAttendanceToExcel);

export default router;
