import {Request as ExpressRequest, Response} from "express";
import {IUser} from "../types/databaseSchema.types";
import {AuthenticatedRequest} from "../middleware/auth.middleware";
import {TestResult} from "../models/tests/testResult.model";
import asyncHandler from "../utils/asyncHandler";
import {ApiError} from "../utils/ApiError";
import {Test} from "../models/tests/test.model";
import {Question} from "../models/questions/questions.model";
import ApiResponse from "../utils/ApiResponse";
import mongoose from "mongoose";

// Custom Request interface to include user
interface Request extends ExpressRequest {
    user?: IUser;
}

// saving the new test result in the database
const submitTest = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {id} = req.params;

    const studentId = req.user?.id;
    if (!studentId) {
        throw new ApiError(401, "Unauthorized access");
    }

    const {selectedAnswers, timeTaken, autoSubmission} = req.body;
    
    // Validate required fields
    if (!selectedAnswers || !Array.isArray(selectedAnswers)) {
        throw new ApiError(400, "Selected answers are required and must be an array");
    }

    const test = await Test.findById(id);
    if (!test) {
        throw new ApiError(404, "Test not found");
    }

    // Extract question IDs from the selected answers
    const questionIds = selectedAnswers.map(answer => answer.questionId);
    
    // Find all questions that were answered
    const questions = await Question.find({_id: {$in: questionIds}});
    
    // Create a map for faster question lookup by ID string
    const questionMap = new Map();

    questions.forEach((question: any) => {
        questionMap.set(question._id.toString(), question);

    });    
    // Calculate score by comparing each selected answer with the correct answer
    let score = 0;
    for (const answer of selectedAnswers) {
        const questionId = answer.questionId.toString();
        const question = questionMap.get(questionId);
        
        // Only increment score if question exists and selected option matches correct answer
        if (question && answer.selectedOption === question.answer) {
            score++;
        }
    }

    const testResult = await TestResult.create({
        testId: id,
        studentId,
        selectedAnswers,
        timeTaken,
        autoSubmission,
        score
    });

    res.status(201).send(
        new ApiResponse(201, {testResult}, "Test submitted successfully")
    );
});

// gathering the existing test results for a student along with the questions asked in the test
const getTestResult = asyncHandler(async (req: Request, res: Response) => {
    const {id} = req.params;
    const studentId = req.user?.id;

    // First, fetch the test result to get the selected answers
    const testResult = await TestResult.findById(id);
    if (!testResult) {
        throw new ApiError(404, "Test result not found");
    }

    // Extract question IDs from the selected answers
    const questionIds = testResult.selectedAnswers.map((answer: any) => 
        new mongoose.Types.ObjectId(answer.questionId)
    );

    // Fetch the questions separately
    const questions = await Question.find({
        _id: { $in: questionIds }
    }).select('_id answer questionText options');

    // Create a map for faster question lookup
    const questionMap = new Map();
    questions.forEach(question => {
        questionMap.set(question.id.toString(), question);
    });

    // Calculate correct answers and prepare detailed question analysis
    const questionAnalysis = testResult.selectedAnswers.map((answer: any) => {
        const questionId = answer.questionId.toString();
        const question = questionMap.get(questionId);
        const isCorrect = question?.answer === answer.selectedOption;
        return {
            questionId: answer.questionId,
            questionText: question.questionText,
            options: question?.options,
            selectedOption: answer.selectedOption,
            correctOption: question?.answer,
            isCorrect: isCorrect
        };
    });

    const correctAnswers = questionAnalysis.filter((q: { isCorrect: any; }) => q.isCorrect).length;

    const response = {
        id: testResult._id,
        totalQuestions: testResult.selectedAnswers.length,
        correctAnswers,
        timeSpent: testResult.timeTaken,
        invalid: testResult.autoSubmission?.isAutoSubmitted ?? false,
        questionAnalysis,
        testId : testResult.testId,
    };

    res.status(200).json(
        new ApiResponse(200, response, "Test result fetched successfully")
    );
});

export {submitTest, getTestResult};