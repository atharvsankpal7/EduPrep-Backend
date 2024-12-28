/*
 API Endpoints needed:
 /api/test/create/ -->
 1. POST undergraduate/gate
 - Creates a GATE test for undergraduate level

 2. POST undergraduate/companySpecific
 - Request body: { company: string }
 - Creates a company specific test for undergraduate level

 3. POST juniorcollege/cet
 - Creates a CET test for junior college level

 4. POST undergraduate/custom
 - Request body: { time: number, numberOfQuestions: number, topicList: TopicList }
 - Creates a custom test for undergraduate level

 5. POST juniorcollege/custom
 - Request body: { time: number, numberOfQuestions: number, topicList: TopicList }
 - Creates a custom test for junior college level

--------------------------------------------------
 for each of the test -->
    1.for non-custom tests get all the topics that are required for the test, and invoke the createCustomTest function with the topics for that non-custom tests
    2.create the custom test with those topics, save it in the database with it's unique id and give the test id to the user
    3.the user will get the testid and will be redirected for that test
    4.user will ask for access of test/get/testid then we have to give the test with that id
    5.after user submits the test then give the result to the user, save the result for that user in the database
*/

import express from 'express';
import {authMiddleware} from '../middleware/auth.middleware';
import {getCompanySpecificTest, getCustomTest} from '../controllers/test.controller';

const router = express.Router();

// Protect all test routes with authentication
router.use(authMiddleware);

// Test creation routes
// router.post('/undergraduate/gate', createGateTest);
router.post('/undergraduate/companySpecific', authMiddleware, getCompanySpecificTest);
// router.post('/juniorcollege/cet', createCETTest);
router.post('/undergraduate/custom', authMiddleware, getCustomTest);
router.post('/juniorcollege/custom', authMiddleware, getCustomTest);

export default router;