import express from 'express';
import {
    createProject,
    getProjects,
    getProjectById,
    updateProject,
    deleteProject
} from '../controllers/projectController';
import { authMiddleware } from '../middleware/auth';
import { requireManager } from '../middleware/roleCheck';
import { body } from 'express-validator';
import { validate } from '../middleware/validation';

const router = express.Router();

router.use(authMiddleware);

router.post("/", createProject);
// router.post(
//     '/createroject',
//     requireManager,
//     [
//         body('name').notEmpty().withMessage('Project name is required'),
//         body('startDate').isISO8601(),
//         body('endDate').isISO8601(),
//         validate
//     ],
//     createProject
// );

router.get('/', getProjects);
router.get('/:id', getProjectById);
router.put('/:id', requireManager, updateProject);
router.delete('/:id', requireManager, deleteProject);

export default router;
