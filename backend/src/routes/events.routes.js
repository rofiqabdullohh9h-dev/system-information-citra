import { Router } from 'express';
import {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
} from '../controllers/eventController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

// Public read access for events (all pengurus, jamaah, and visitors)
router.get('/', getAllEvents);
router.get('/:id', getEventById);

// Authenticated mutations for Pengurus only
router.use(authMiddleware);
router.post('/', createEvent);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);

export default router;
