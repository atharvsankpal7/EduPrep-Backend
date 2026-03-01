import { Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import ApiResponse from "../utils/ApiResponse";
import { submitTestBodySchema, testIdParamsSchema } from "../ZodSchema/testSchema";
import { validateType } from "../utils/zodValidator";
import {
    buildOrderedQuestionAnalysis,
    createTestResultWithAnswers,
    findTestById,
    findTestResultById,
    getTestQuestionInfo,
    getTestResultAnswers,
} from "../db/helpers/test.helpers";

// saving the new test result in the database
const submitTest = async (req: Request, res: Response) => {
    const { id } = validateType(testIdParamsSchema, req.params);

    const studentId = req.loggedInUser.id;
    if (!studentId) {
        throw new ApiError(401, "Unauthorized access");
    }
    const { selectedAnswers, timeTaken, autoSubmission } = validateType(submitTestBodySchema, req.body);

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
        const matchingAnswer = selectedAnswers.find((ans) => ans.questionId === question.questionId);
        const selectedOption = matchingAnswer ? matchingAnswer.selectedOption : -1;

        if (selectedOption !== -1 && selectedOption === question.answer) {
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
        isAutoSubmitted: autoSubmission.isAutoSubmitted,
        tabSwitches: autoSubmission.tabSwitches,
        score,
        answers: mappedAnswers,
    });

    // Build questionAnalysis from the canonical test structure (single source of truth)
    const questionAnalysis = await buildOrderedQuestionAnalysis(id, mappedAnswers);
    const correctAnswers = questionAnalysis.filter((q) => q.isCorrect).length;

    const resultData = {
        id: testResult.id,
        totalQuestions: questionAnalysis.length,
        correctAnswers,
        timeSpent: timeTaken,
        invalid: autoSubmission.isAutoSubmitted && autoSubmission.tabSwitches >= 3,
        questionAnalysis,
        testId: id,
    };

    res.status(201).send(
        new ApiResponse(201, { testResult, resultData }, "Test submitted successfully")
    );
};

// gathering the existing test results for a student along with the questions asked in the test
const getTestResult = async (req: Request, res: Response) => {
    const { id } = validateType(testIdParamsSchema, req.params);

    // First, fetch the test result to get the selected answers
    const testResult = await findTestResultById(id);
    if (!testResult) {
        throw new ApiError(404, "Test result not found");
    }

    // Ensure the user is authorized to view this result
    if (testResult.studentId !== req.loggedInUser.id && req.loggedInUser.role !== 'admin') {
        throw new ApiError(403, "You are not authorized to view this test result");
    }

    // Get raw answers, then build analysis from the canonical test structure
    const answers = await getTestResultAnswers(id);
    const questionAnalysis = await buildOrderedQuestionAnalysis(testResult.testId, answers);
    const correctAnswers = questionAnalysis.filter((q) => q.isCorrect).length;

    const response = {
        id: testResult.id,
        totalQuestions: questionAnalysis.length,
        correctAnswers,
        timeSpent: testResult.timeTaken,
        invalid: testResult.isAutoSubmitted && testResult.tabSwitches >= 3,
        questionAnalysis,
        testId: testResult.testId,
    };

    res.status(200).json(
        new ApiResponse(200, response, "Test result fetched successfully")
    );
};

export { submitTest, getTestResult };
