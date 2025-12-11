import express from 'express';
import { getProductivityReport, getTaskPerformance } from '../controllers/reportController';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

router.use(authMiddleware);

router.get('/productivity', getProductivityReport);
router.get('/performance', getTaskPerformance);

export default router;
