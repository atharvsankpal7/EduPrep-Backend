import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import ApiResponse from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import logger from "../utils/logger";
import {
  countTestResultsByStudent,
  findTestResultWithTest,
  getRecentTestsByStudent,
  getStudentTestHistoryPaginated,
  getTestResultAnswers,
  getTopicPerformanceForStudent,
  getUserPerformanceSummary,
} from "../db/helpers/test.helpers";
import { getQuestionsWithDetails } from "../db/helpers/question.helpers";

/**
 * Get all test attempts for the authenticated user
 */
const getUserTestHistory = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    
    if (!userId) {
      throw new ApiError(401, "Unauthorized access");
    }

    // Get pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Count total test results for pagination
    const totalResults = await countTestResultsByStudent(userId);

    // Get test results with test details
    const testResults = await getStudentTestHistoryPaginated(userId, limit, skip);

    logger.info(`Retrieved test history for user ${userId}`);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          testResults,
          pagination: {
            total: totalResults,
            page,
            limit,
            pages: Math.ceil(totalResults / limit)
          }
        },
        "Test history retrieved successfully"
      )
    );
  }
);

/**
 * Get detailed test result with recommendations
 */
const getTestResultWithRecommendations = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { resultId } = req.params;
    
    if (!userId) {
      throw new ApiError(401, "Unauthorized access");
    }

    // Get the test result
    const testResult = await findTestResultWithTest(resultId, userId);

    if (!testResult) {
      logger.warn(`Test result not found: ${resultId} for user ${userId}`);
      throw new ApiError(404, "Test result not found");
    }

    // Get all question IDs from the test result
    const answers = await getTestResultAnswers(resultId);
    const questionIds = answers.map(answer => answer.questionId);

    // Fetch all questions with their topics
    const questions = await getQuestionsWithDetails(questionIds);

    // Create a map for quick question lookup
    const questionMap = new Map(questions.map(q => [q.id.toString(), q]));

    // Analyze incorrect answers by topic
    const topicPerformance = new Map();
    
    answers.forEach(answer => {
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
          incorrect: 0
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

    // Convert map to array and sort by incorrect answers (descending)
    const topicPerformanceArray = Array.from(topicPerformance.values())
      .map(topic => ({
        ...topic,
        percentageCorrect: topic.total > 0 ? (topic.correct / topic.total) * 100 : 0
      }))
      .sort((a, b) => b.incorrect - a.incorrect);

    // Get top 3 topics with most incorrect answers for recommendations
    const recommendations = topicPerformanceArray.slice(0, 3);

    // Prepare response
    const response = {
      testResult: {
        _id: testResult.id,
        testId: testResult.testId,
        testName: testResult.testName,
        score: testResult.score,
        totalQuestions: testResult.totalQuestions,
        percentageScore: testResult.totalQuestions > 0
          ? (testResult.score / testResult.totalQuestions) * 100
          : 0,
        timeTaken: testResult.timeTaken,
        createdAt: testResult.createdAt
      },
      topicPerformance: topicPerformanceArray,
      recommendations: recommendations.length > 0 ? recommendations : [{ message: "No specific recommendations available" }]
    };

    logger.info(`Retrieved test result with recommendations for user ${userId}, result ${resultId}`);

    res.status(200).json(
      new ApiResponse(
        200,
        response,
        "Test result with recommendations retrieved successfully"
      )
    );
  }
);

/**
 * Get overall performance analytics for the user
 */
const getUserPerformanceAnalytics = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    
    if (!userId) {
      throw new ApiError(401, "Unauthorized access");
    }

    // Get all test results for the user
    const summary = await getUserPerformanceSummary(userId);
    if (summary.totalTests === 0) {
      res.status(200).json(
        new ApiResponse(
          200,
          {
            totalTests: 0,
            averageScore: 0,
            topicRecommendations: [],
            recentTests: []
          },
          "No test history found"
        )
      );
      return;
    }

    const averageScore = summary.totalQuestions > 0
      ? (summary.totalScore / summary.totalQuestions) * 100
      : 0;

    const topicPerformanceRows = await getTopicPerformanceForStudent(userId);
    const topicPerformanceArray = topicPerformanceRows
      .map((topic) => ({
        ...topic,
        percentageCorrect: topic.total > 0 ? (topic.correct / topic.total) * 100 : 0
      }))
      .sort((a, b) => a.percentageCorrect - b.percentageCorrect);

    const topicRecommendations = topicPerformanceArray.slice(0, 3);
    const recentTests = await getRecentTestsByStudent(userId, 5);
    
    logger.info(`Retrieved performance analytics for user ${userId}`);
    
    res.status(200).json(
      new ApiResponse(
        200,
        {
          totalTests: summary.totalTests,
          averageScore,
          topicRecommendations,
          recentTests
        },
        "Performance analytics retrieved successfully"
      )
    );
  }
);

export { getUserTestHistory, getTestResultWithRecommendations, getUserPerformanceAnalytics };
