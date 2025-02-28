import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { 
  getUserTestHistory, 
  getTestResultWithRecommendations,
  getUserPerformanceAnalytics
} from '../controllers/testHistory.controller';

const router = express.Router();

// Protect all routes with authentication
router.use(authMiddleware);

// Test history routes
router.get('/', getUserTestHistory);
router.get('/analytics', getUserPerformanceAnalytics);
router.get('/:resultId', getTestResultWithRecommendations);

export default router;