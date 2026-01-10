import express from 'express';
import { signCloudinary } from '../controllers/cloudinaryController';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

router.get('/sign', authMiddleware, signCloudinary);

export default router;
