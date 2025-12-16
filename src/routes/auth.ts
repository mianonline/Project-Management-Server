import express from 'express';
import { register, login, getProfile, googleAuth, getAllUsers, editProfile } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';
import { body } from 'express-validator';
import { validate } from '../middleware/validation';

const router = express.Router();

router.post(
    '/register',
    [
        body('email').isEmail().withMessage('Invalid email'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
        body('name').notEmpty().withMessage('Name is required'),
        validate
    ],
    register
);

router.post(
    '/login',
    [
        body('email').isEmail(),
        body('password').exists(),
        validate
    ],
    login
);

router.get('/profile', authMiddleware, getProfile);

router.put('/profile', authMiddleware, editProfile);

router.post('/google', googleAuth);

router.get('/all-users', authMiddleware, getAllUsers);

export default router;
