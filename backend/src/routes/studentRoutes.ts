import express from 'express';
import { 
  getAllStudents, 
  getStudentByUSN, 
  updatePlacementStatus, 
  getPlacementStatistics, 
  updateStudentProfile, 
  updateStudentDetailsByAdmin 
} from '../controllers/studentController';
import { analyzeResumeText } from '../controllers/resumeAnalysisController';
import { protect, adminOnly, studentOnly } from '../middleware/auth';

const router = express.Router();

// Student profile update route (student only)
router.put('/profile', protect, updateStudentProfile);

// AI resume analysis (student only; requires GEMINI_API_KEY on server)
router.post('/resume-analysis', protect, studentOnly, analyzeResumeText);

// Admin-only routes - apply middleware to protect these routes
router.use(protect, adminOnly);

// Admin-only routes
router.get('/', getAllStudents);
router.get('/statistics', getPlacementStatistics);
router.get('/:usn', getStudentByUSN);
router.put('/:usn/placement-status', updatePlacementStatus);
router.put('/:usn/update', updateStudentDetailsByAdmin);

export default router;