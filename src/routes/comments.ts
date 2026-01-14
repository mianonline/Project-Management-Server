import express from 'express';
import {
  createComment,
  getCommentsByTaskId,
  deleteComment,
} from '../controllers/commentController';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

router.use(authMiddleware);

router.get('/task/:taskId', getCommentsByTaskId);
router.post('/task/:taskId', createComment);
router.delete('/:id', deleteComment);

export default router;
