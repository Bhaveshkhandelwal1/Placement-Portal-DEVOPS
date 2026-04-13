import express from 'express';
import { handleMockInterviewChat } from '../controllers/mockInterviewController';
import { protect, studentOnly } from '../middleware/auth';

const router = express.Router();

router.post('/chat', protect, studentOnly, handleMockInterviewChat);

export default router;
