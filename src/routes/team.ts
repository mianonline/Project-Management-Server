import express from 'express';
import { getTeamMembers, updateMemberRole, createTeam, getTeam } from '../controllers/teamController';
import { authMiddleware } from '../middleware/auth';
import { requireManager } from '../middleware/roleCheck';

const router = express.Router();

router.use(authMiddleware);

router.post('/', requireManager, createTeam);
router.get('/', getTeam);
router.get('/getTeamMembers', getTeamMembers);
router.put('/:userId/role', requireManager, updateMemberRole);

export default router;
