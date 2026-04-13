import express from 'express';
import { handleQuery } from '../controllers/chatController';
import { protect, studentOnly } from '../middleware/auth';

const router = express.Router();

// Route specifically for student queries
router.post('/query', protect, studentOnly, handleQuery);

export default router;
