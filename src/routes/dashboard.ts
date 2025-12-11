import express from 'express';
import { getKPIs, getRecentActivity, getProjectStats } from '../controllers/dashboardController';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

router.use(authMiddleware);

router.get('/kpis', getKPIs);
router.get('/recent-activity', getRecentActivity);
router.get('/project-stats', getProjectStats);

export default router;
