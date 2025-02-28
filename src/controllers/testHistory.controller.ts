import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import asyncHandler from "../utils/asyncHandler";
import { TestResult } from "../models/tests/testResult.model";
import { Test } from "../models/tests/test.model";
import { Question } from "../models/questions/questions.model";
import { Topic } from "../models/topics/topic.model";
import ApiResponse from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import logger from "../utils/logger";
import mongoose from "mongoose";

/**
 * Get all test attempts for the authenticated user
 */
const getUserTestHistory = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    
    if (!userId) {
      throw new ApiError(401, "Unauthorized access");
    }

    // Get pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Count total test results for pagination
    const totalResults = await TestResult.countDocuments({ studentId: userId });

    // Get test results with test details
    const testResults = await TestResult.aggregate([
      { $match: { studentId: new mongoose.Types.ObjectId(userId) } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "tests",
          localField: "testId",
          foreignField: "_id",
          as: "testDetails"
        }
      },
      { $unwind: "$testDetails" },
      {
        $project: {
          _id: 1,
          testId: 1,
          score: 1,
          timeTaken: 1,
          createdAt: 1,
          "testDetails.testName": 1,
          "testDetails.totalQuestions": 1,
          "testDetails.totalDuration": 1,
          percentageScore: { 
            $multiply: [
              { $divide: ["$score", "$testDetails.totalQuestions"] }, 
              100
            ] 
          }
        }
      }
    ]);

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
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    const { resultId } = req.params;
    
    if (!userId) {
      throw new ApiError(401, "Unauthorized access");
    }

    // Get the test result
    const testResult = await TestResult.findOne({
      _id: resultId,
      studentId: userId
    });

    if (!testResult) {
      logger.warn(`Test result not found: ${resultId} for user ${userId}`);
      throw new ApiError(404, "Test result not found");
    }

    // Get the test details
    const test = await Test.findById(testResult.testId);
    if (!test) {
      logger.error(`Test not found for result: ${resultId}`);
      throw new ApiError(404, "Test not found");
    }

    // Get all question IDs from the test result
    const questionIds = testResult.selectedAnswers.map(answer => answer.questionId);

    // Fetch all questions with their topics
    const questions = await Question.aggregate([
      {
        $match: { _id: { $in: questionIds } }
      },
      {
        $lookup: {
          from: "topics",
          localField: "topicIds",
          foreignField: "_id",
          as: "topics"
        }
      }
    ]);

    // Create a map for quick question lookup
    const questionMap = new Map(questions.map(q => [q._id.toString(), q]));

    // Analyze incorrect answers by topic
    const topicPerformance = new Map();
    
    testResult.selectedAnswers.forEach(answer => {
      const question = questionMap.get(answer.questionId.toString());
      if (!question) return;
      
      const isCorrect = question.answer === answer.selectedOption;
      
      question.topics.forEach((topic: { _id: { toString: () => any; }; topicName: any; }) => {
        const topicId = topic._id.toString();
        const topicName = topic.topicName;
        
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
        _id: testResult._id,
        testId: testResult.testId,
        testName: test.testName,
        score: testResult.score,
        totalQuestions: test.totalQuestions,
        percentageScore: (testResult.score / test.totalQuestions) * 100,
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
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    
    if (!userId) {
      throw new ApiError(401, "Unauthorized access");
    }

    // Get all test results for the user
    const testResults = await TestResult.find({ studentId: userId });
    
    if (testResults.length === 0) {
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
    }

    // Get all test IDs
    const testIds = testResults.map(result => result.testId);
    
    // Get test details
    const tests = await Test.find({ _id: { $in: testIds } });
    const testMap = new Map(tests.map(test => [test.id.toString(), test]));
    
    // Calculate average score
    let totalScore = 0;
    let totalQuestions = 0;
    
    testResults.forEach(result => {
      const test = testMap.get(result.testId.toString());
      if (test) {
        totalScore += result.score;
        totalQuestions += test.totalQuestions;
      }
    });
    
    const averageScore = totalQuestions > 0 ? (totalScore / totalQuestions) * 100 : 0;
    
    // Get all question IDs from all test results
    const allAnswers = testResults.flatMap(result => result.selectedAnswers);
    const questionIds = allAnswers.map(answer => answer.questionId);
    
    // Fetch all questions with their topics
    const questions = await Question.aggregate([
      {
        $match: { _id: { $in: questionIds } }
      },
      {
        $lookup: {
          from: "topics",
          localField: "topicIds",
          foreignField: "_id",
          as: "topics"
        }
      }
    ]);
    
    // Create a map for quick question lookup
    const questionMap = new Map(questions.map(q => [q._id.toString(), q]));
    
    // Analyze performance by topic
    const topicPerformance = new Map();
    
    allAnswers.forEach(answer => {
      const question = questionMap.get(answer.questionId.toString());
      if (!question) return;
      
      const isCorrect = question.answer === answer.selectedOption;
      
      question.topics.forEach((topic: { _id: { toString: () => any; }; topicName: any; }) => {
        const topicId = topic._id.toString();
        const topicName = topic.topicName;
        
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
    });
    
    // Convert map to array and calculate percentages
    const topicPerformanceArray = Array.from(topicPerformance.values())
      .map(topic => ({
        ...topic,
        percentageCorrect: topic.total > 0 ? (topic.correct / topic.total) * 100 : 0
      }))
      .sort((a, b) => a.percentageCorrect - b.percentageCorrect); // Sort by lowest performance first
    
    // Get top 3 topics with lowest performance for recommendations
    const topicRecommendations = topicPerformanceArray.slice(0, 3);
    
    // Get recent tests (last 5)
    const recentTests = await TestResult.aggregate([
      { $match: { studentId: new mongoose.Types.ObjectId(userId) } },
      { $sort: { createdAt: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "tests",
          localField: "testId",
          foreignField: "_id",
          as: "testDetails"
        }
      },
      { $unwind: "$testDetails" },
      {
        $project: {
          _id: 1,
          testId: 1,
          score: 1,
          createdAt: 1,
          "testDetails.testName": 1,
          "testDetails.totalQuestions": 1,
          percentageScore: { 
            $multiply: [
              { $divide: ["$score", "$testDetails.totalQuestions"] }, 
              100
            ] 
          }
        }
      }
    ]);
    
    logger.info(`Retrieved performance analytics for user ${userId}`);
    
    res.status(200).json(
      new ApiResponse(
        200,
        {
          totalTests: testResults.length,
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