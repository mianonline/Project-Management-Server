import express from 'express';
import {
    createTask,
    getTasks,
    getTaskById,
    updateTask,
    deleteTask
} from '../controllers/taskController';
import { authMiddleware } from '../middleware/auth';
import { body } from 'express-validator';
import { validate } from '../middleware/validation';

const router = express.Router();

router.use(authMiddleware);



router.post(
    '/',
    [
        body('name').notEmpty().withMessage('Task name is required'),
        body('projectId').notEmpty().withMessage('Project ID is required'),
        validate
    ],
    createTask
);

router.get('/', getTasks);
router.get('/:id', getTaskById);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

export default router;
