import express from 'express';
import { getBudgetOverview, updateBudget } from '../controllers/budgetController';
import { authMiddleware } from '../middleware/auth';
import { requireManager } from '../middleware/roleCheck';

const router = express.Router();

router.use(authMiddleware);

router.get('/overview', getBudgetOverview);
router.put('/:projectId', requireManager, updateBudget);

export default router;
