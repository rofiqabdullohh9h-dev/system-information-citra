import { Router } from 'express';
import {
  getAllAttendances,
  getEventAttendance,
  recordBulkAttendance,
  getTodayEventsAndAttendance,
} from '../controllers/attendanceController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

// Read access for attendance stats
router.get('/', getAllAttendances);
router.get('/event/:eventId', getEventAttendance);

// Authenticated actions for Pengurus
router.use(authMiddleware);
router.get('/today', getTodayEventsAndAttendance);
router.post('/bulk', recordBulkAttendance);

export default router;

