import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { getCETTopics, getAllTopics, getTopicsBySubject } from '../controllers/topic.controller';

const router = express.Router();


// Get CET topics distribution
router.get('/cet', getCETTopics);

// Get all topics grouped by subject and domain
router.get('/all', getAllTopics);

// Get topics for a specific subject
router.get('/subject/:subjectName', getTopicsBySubject);

export default router;