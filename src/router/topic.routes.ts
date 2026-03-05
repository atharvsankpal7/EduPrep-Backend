import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { getCETTopics, getAllTopics, getTopicsBySubject } from '../controllers/topic.controller';

const router = express.Router();

// Protect all topic routes with authentication
router.use(authMiddleware);

router.get('/cet', getCETTopics);

router.get('/all', getAllTopics);

router.get('/subject/:subjectName', getTopicsBySubject);

export default router;