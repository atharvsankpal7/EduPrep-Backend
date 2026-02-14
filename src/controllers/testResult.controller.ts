import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import ApiResponse from "../utils/ApiResponse";
import {
  createTestResultWithAnswers,
  findTestById,
  findTestResultById,
  getTestQuestionInfo,
  getTestResultAnswers,
} from "../db/helpers/test.helpers";
import { findQuestionsByIds } from "../db/helpers/question.helpers";

// saving the new test result in the database
const submitTest = asyncHandler(async (req: Request, res: Response) => {
    const {id} = req.params;

    const studentId = req.user?.id;
    if (!studentId) {
        throw new ApiError(401, "Unauthorized access");
    }

    const { selectedAnswers, timeTaken, autoSubmission } = req.body;
    
    // Validate required fields
    if (!selectedAnswers) {
        throw new ApiError(400, "Answers are required and must be an array");
    }

    const test = await findTestById(id);
    if (!test) {
        throw new ApiError(404, "Test not found");
    }

    const testQuestionInfo = await getTestQuestionInfo(id);
    if (testQuestionInfo.length === 0) {
        throw new ApiError(400, "No questions found for this test");
    }

    if (selectedAnswers.length !== testQuestionInfo.length) {
        throw new ApiError(400, "Answers length does not match test questions");
    }

    let score = 0;
    const mappedAnswers = testQuestionInfo.map((question) => {
        const answer = selectedAnswers.find((a: any) => String(a.questionId) === String(question.questionId));

        if (!answer) {
            throw new ApiError(400, `Answer for question ${question.questionId} not found`);
        }

        const selectedOption = answer.selectedOption;
        if (selectedOption === question.answer) {
            score++;
        }
        return {
            questionId: question.questionId,
            selectedOption,
            sectionId: question.sectionId,
        };
    });

    const testResult = await createTestResultWithAnswers({
        testId: id,
        studentId,
        timeTaken,
        isAutoSubmitted: Boolean(autoSubmission?.isAutoSubmitted),
        tabSwitches: Number(autoSubmission?.tabSwitches ?? 0),
        score,
        answers: mappedAnswers,
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
    const testResult = await findTestResultById(id);
    if (!testResult) {
        throw new ApiError(404, "Test result not found");
    }

    const answers = await getTestResultAnswers(id);
    const questionIds = answers.map((answer) => answer.questionId);

    // Fetch the questions separately
    const questions = await findQuestionsByIds(questionIds);

    // Create a map for faster question lookup
    const questionMap = new Map();
    questions.forEach(question => {
        questionMap.set(question.id.toString(), question);
    });

    // Calculate correct answers and prepare detailed question analysis
    const questionAnalysis = answers.map((answer) => {
        const questionId = answer.questionId.toString();
        const question = questionMap.get(questionId);
        const isCorrect = question?.answer === answer.selectedOption;
        return {
            questionId: answer.questionId,
            questionText: question.questionText,
            options: question?.options,
            selectedOption: answer.selectedOption - 1,
            correctOption: question?.answer - 1,
            isCorrect: isCorrect
        };
    });

    const correctAnswers = questionAnalysis.filter((q: { isCorrect: any; }) => q.isCorrect).length;

    const response = {
        id: testResult.id,
        totalQuestions: answers.length,
        correctAnswers,
        timeSpent: testResult.timeTaken,
        invalid: testResult.isAutoSubmitted,
        questionAnalysis,
        testId : testResult.testId,
    };

    res.status(200).json(
        new ApiResponse(200, response, "Test result fetched successfully")
    );
});

export {submitTest, getTestResult};
