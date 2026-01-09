import express from 'express';
import { register, login, getProfile, googleAuth, getAllUsers, editProfile, changePassword, forgotPassword, resetPassword, githubAuth, deleteAccount } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';
import { body } from 'express-validator';
import { validate } from '../middleware/validation';

const router = express.Router();

router.post(
    '/register',
    [
        body('email').isEmail().withMessage('Invalid email'),
        body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
        body('name').optional().notEmpty().withMessage('Name is required'),
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
router.put('/change-password', authMiddleware, changePassword);
router.delete('/account', authMiddleware, deleteAccount);
router.post('/google', googleAuth);
router.post('/github', githubAuth);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

router.get('/all-users', authMiddleware, getAllUsers);

export default router;
