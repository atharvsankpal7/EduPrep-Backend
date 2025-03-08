import {Request as ExpressRequest, Response} from "express";
import {IUser} from "../types/databaseSchema.types.ts";
import {AuthenticatedRequest} from "../middleware/auth.middleware.ts";
import {TestResult} from "../models/tests/testResult.model.ts";
import asyncHandler from "../utils/asyncHandler.ts";
import {ApiError} from "../utils/ApiError.ts";
import {Test} from "../models/tests/test.model.ts";
import {Question} from "../models/questions/questions.model.ts";
import ApiResponse from "../utils/ApiResponse.ts";
import mongoose from "mongoose";

// Custom Request interface to include user
interface Request extends ExpressRequest {
    user?: IUser;
}

// saving the new test result in the database
const submitTest = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {id} = req.params;
    console.log("test is being submitted for ", req.user?.id);

    const studentId = req.user?.id;
    if (!studentId) {
        throw new ApiError(401, "Unauthorized access");
    }

    console.log("student id is ", studentId);
    const {selectedAnswers, timeTaken, autoSubmission} = req.body;
    
    // Validate required fields
    if (!selectedAnswers || !Array.isArray(selectedAnswers)) {
        throw new ApiError(400, "Selected answers are required and must be an array");
    }

    const test = await Test.findById(id);
    if (!test) {
        throw new ApiError(404, "Test not found");
    }

    

    const questionIds = test.sections.flatMap(section => section.questions);
    if (questionIds.length !== selectedAnswers.length) {
        throw new ApiError(400, "Number of answers does not match number of questions");
    }

    const questions = await Question.find({_id: {$in: questionIds}}).select('answer');
    const score = questions.filter((q, i) => q.answer === selectedAnswers[i].selectedOption).length;

    const testResult = await TestResult.create({
        testId: id,
        studentId,
        selectedAnswers,
        timeTaken,
        autoSubmission,
        score
    });

    console.log("test result is ", testResult);
    res.status(201).send(
        new ApiResponse(201, {testResult}, "Test submitted successfully")
    );
})
// gathering the existing test results for a student along with the questions asked in the test
const getTestResult = asyncHandler(async (req: Request, res: Response) => {
    const {id} = req.params;
    const studentId = req.user?.id;

   console.log("test result is being fetched for ", req.user?.id);
   console.log(id)
    // Aggregation pipeline for fetching test results and related questions
    
    const [testResult] = await TestResult.aggregate([
        {
            $match: {
                _id:new mongoose.Types.ObjectId(id),
            },
        },
        {
            $lookup: { // get the questions that were asked in the test
                from: "question",
                let: {questionIds: "$selectedAnswers.questionId"},
                pipeline: [
                    {
                        $match: {
                            $expr: {$in: ["$_id", "$questionIds"]},
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            answer: 1,
                            question: 1,
                            options: 1
                        },
                    },
                ],
                as: "questions",
            },
        },
        {
            $project: {
                _id: 1,
                selectedAnswers: 1,
                timeTaken: 1,
                "autoSubmission.isAutoSubmitted": 1,
                questions: 1,
            },
        },
    ]);
    console.log("test result is ", testResult);
    if (!testResult) {
        throw new ApiError(404, "Test not found");
    }

    // Calculate correct answers and prepare detailed question analysis
    const questionAnalysis = testResult.selectedAnswers.map((answer: {
        questionId: { toString: () => string };
        selectedOption: string
    }) => {
        const question = testResult.questions?.find(
            (q: { _id: { toString: () => string }; }) => q._id.toString() === answer.questionId.toString()
        );
        const isCorrect = question?.answer === answer.selectedOption;
        
        return {
            questionId: answer.questionId,
            question: question?.question,
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
        questionAnalysis
    };

    res.status(200).json(
        new ApiResponse(200, response, "Test result fetched successfully")
    );
});export {submitTest, getTestResult};