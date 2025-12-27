import express from 'express';
import { getTeamMembers, updateMemberRole, createTeam, getTeam, inviteTeamMember, acceptInvitation, declineInvitation, getTeamStats, getTeamFiles } from '../controllers/teamController';
import { authMiddleware } from '../middleware/auth';
import { requireManager } from '../middleware/roleCheck';

const router = express.Router();

router.use(authMiddleware);

router.post('/', requireManager, createTeam);
router.get('/', getTeam);
router.get('/getTeamMembers', getTeamMembers);
router.get('/:teamId/stats', getTeamStats);
router.get('/:teamId/files', getTeamFiles);
router.put('/:userId/role', requireManager, updateMemberRole);
router.post('/invite', requireManager, inviteTeamMember);
router.get('/invitation/:token/accept', acceptInvitation);
router.get('/invitation/:token/decline', declineInvitation);

export default router;
