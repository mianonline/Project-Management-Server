import { createSection } from '../controllers/sectionController';
import { authMiddleware } from '../middleware/auth';
import { body } from 'express-validator';
import { validate } from '../middleware/validation';
import express from 'express';

const router = express.Router();

router.use(authMiddleware);

router.post(
    '/',
    [
        body('title').notEmpty().withMessage('Section title is required'),
        body('projectId').notEmpty().withMessage('Project ID is required'),
        validate
    ],
    createSection
);

export default router;
