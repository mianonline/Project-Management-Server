import express from 'express';
import { createEvent, getEvents, deleteEvent } from '../controllers/calendarController';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

router.use(authMiddleware);

router.post('/', createEvent);
router.get('/', getEvents);
router.delete('/:id', deleteEvent);

export default router;
