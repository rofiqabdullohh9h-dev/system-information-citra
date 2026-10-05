import { Router } from 'express';
import {
  getPublicEvents,
  getPublicEventDetail,
  getPublicStatistics,
} from '../controllers/publicController.js';

const router = Router();

router.get('/events', getPublicEvents);
router.get('/events/:id', getPublicEventDetail);
router.get('/statistics', getPublicStatistics);

export default router;
