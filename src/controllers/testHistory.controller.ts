import { Request, Response } from "express";
import ApiResponse from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import logger from "../utils/logger";
import { validateType } from "../utils/zodValidator";
import { testHistoryQuerySchema } from "../ZodSchema/testHistorySchema";
import { resultIdParamsSchema } from "../ZodSchema/testSchema";
import { getStudentTestHistoryDashboard } from "../db/helpers/testHistory.helpers";
import {
  findTestResultWithTest,
  getTestResultAnswers,
} from "../db/helpers/test.helpers";
import { getQuestionsWithDetails } from "../db/helpers/question.helpers";

/**
 * GET /test-history
 * 
 * Returns paginated + filtered test history for the authenticated student.
 * All logic (filtering, sorting, pagination, topic aggregation, test-type
 * derivation) lives in a single SQL query — the controller is a thin pass-through.
 */
const getUserTestHistory = async (req: Request, res: Response) => {
  const userId = req.loggedInUser.id;

  if (!userId) {
    throw new ApiError(401, "Unauthorized access");
  }

  const params = validateType(testHistoryQuerySchema, req.query);
  const result = await getStudentTestHistoryDashboard(userId, params);

  logger.info(`Retrieved test history for user ${userId}, page ${params.page}`);

  res.status(200).json(
    new ApiResponse(200, result, "Test history retrieved successfully")
  );
};

/**
 * GET /test-history/:resultId
 * 
 * Returns detailed test result with topic-level performance
 * breakdown and recommendations.
 */
const getTestResultWithRecommendations = async (req: Request, res: Response) => {
  const userId = req.loggedInUser.id;
  const { resultId } = validateType(resultIdParamsSchema, req.params);

  if (!userId) {
    throw new ApiError(401, "Unauthorized access");
  }

  const testResult = await findTestResultWithTest(resultId, userId);

  if (!testResult) {
    logger.warn(`Test result not found: ${resultId} for user ${userId}`);
    throw new ApiError(404, "Test result not found");
  }

  const answers = await getTestResultAnswers(resultId);
  const questionIds = answers.map((answer) => answer.questionId);
  const questions = await getQuestionsWithDetails(questionIds);
  const questionMap = new Map(questions.map((q) => [q.id.toString(), q]));

  const topicPerformance = new Map();

  answers.forEach((answer) => {
    const question = questionMap.get(answer.questionId.toString());
    if (!question) return;

    const isCorrect = question.answer === answer.selectedOption;
    const topicId = question.topicId?.toString();
    const topicName = question.topicName;

    if (!topicId || !topicName) return;

    if (!topicPerformance.has(topicId)) {
      topicPerformance.set(topicId, {
        topicId,
        topicName,
        total: 0,
        correct: 0,
        incorrect: 0,
      });
    }

    const performance = topicPerformance.get(topicId);
    performance.total += 1;
    if (isCorrect) {
      performance.correct += 1;
    } else {
      performance.incorrect += 1;
    }
  });

  const topicPerformanceArray = Array.from(topicPerformance.values())
    .map((topic) => ({
      ...topic,
      percentageCorrect:
        topic.total > 0 ? (topic.correct / topic.total) * 100 : 0,
    }))
    .sort((a, b) => b.incorrect - a.incorrect);

  const recommendations = topicPerformanceArray.slice(0, 3);

  const response = {
    testResult: {
      _id: testResult.id,
      testId: testResult.testId,
      testName: testResult.testName,
      score: testResult.score,
      totalQuestions: testResult.totalQuestions,
      percentageScore:
        testResult.totalQuestions > 0
          ? (testResult.score / testResult.totalQuestions) * 100
          : 0,
      timeTaken: testResult.timeTaken,
      createdAt: testResult.createdAt,
    },
    topicPerformance: topicPerformanceArray,
    recommendations:
      recommendations.length > 0
        ? recommendations
        : [{ message: "No specific recommendations available" }],
  };

  logger.info(
    `Retrieved test result with recommendations for user ${userId}, result ${resultId}`
  );

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        response,
        "Test result with recommendations retrieved successfully"
      )
    );
};

/**
 * GET /test-history/analytics
 * 
 * Returns overall performance analytics for the authenticated user.
 */
const getUserPerformanceAnalytics = async (req: Request, res: Response) => {
  const userId = req.loggedInUser.id;

  if (!userId) {
    throw new ApiError(401, "Unauthorized access");
  }

  // Import here to reuse existing helpers (these are unchanged)
  const {
    getUserPerformanceSummary,
    getTopicPerformanceForStudent,
    getRecentTestsByStudent,
  } = await import("../db/helpers/test.helpers");

  const summary = await getUserPerformanceSummary(userId);

  if (summary.totalTests === 0) {
    res.status(200).json(
      new ApiResponse(
        200,
        {
          totalTests: 0,
          averageScore: 0,
          topicRecommendations: [],
          recentTests: [],
        },
        "No test history found"
      )
    );
    return;
  }

  const averageScore =
    summary.totalQuestions > 0
      ? (summary.totalScore / summary.totalQuestions) * 100
      : 0;

  const [topicPerformanceRows, recentTests] = await Promise.all([
    getTopicPerformanceForStudent(userId),
    getRecentTestsByStudent(userId, 5),
  ]);

  const topicPerformanceArray = topicPerformanceRows
    .map((topic) => ({
      ...topic,
      percentageCorrect:
        topic.total > 0 ? (topic.correct / topic.total) * 100 : 0,
    }))
    .sort((a, b) => a.percentageCorrect - b.percentageCorrect);

  const topicRecommendations = topicPerformanceArray.slice(0, 3);

  logger.info(`Retrieved performance analytics for user ${userId}`);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        totalTests: summary.totalTests,
        averageScore,
        topicRecommendations,
        recentTests,
      },
      "Performance analytics retrieved successfully"
    )
  );
};

export {
  getUserTestHistory,
  getTestResultWithRecommendations,
  getUserPerformanceAnalytics,
};
