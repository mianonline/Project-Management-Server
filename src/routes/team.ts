import express from 'express';
import { getTeamMembers, updateMemberRole, createTeam } from '../controllers/teamController';
import { authMiddleware } from '../middleware/auth';
import { requireManager } from '../middleware/roleCheck';

const router = express.Router();

router.use(authMiddleware);

router.get('/', getTeamMembers);
router.post('/', requireManager, createTeam);
router.put('/:userId/role', requireManager, updateMemberRole);

export default router;
