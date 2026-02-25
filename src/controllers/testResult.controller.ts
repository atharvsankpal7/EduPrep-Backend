import { Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import ApiResponse from "../utils/ApiResponse";
import { submitTestBodySchema, testIdParamsSchema } from "../ZodSchema/testSchema";
import { validateType } from "../utils/zodValidator";
import {
  createTestResultWithAnswers,
  findTestById,
  findTestResultById,
  getTestQuestionInfo,
  getTestResultAnswersWithQuestionDetails,
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
    const mappedAnswers = testQuestionInfo.map((question, index) => {
        const selectedOption = selectedAnswers[index].selectedOption;
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
        isAutoSubmitted: autoSubmission.isAutoSubmitted,
        tabSwitches: autoSubmission.tabSwitches,
        score,
        answers: mappedAnswers,
    });

    res.status(201).send(
        new ApiResponse(201, {testResult}, "Test submitted successfully")
    );
};

// gathering the existing test results for a student along with the questions asked in the test
const getTestResult = async (req: Request, res: Response) => {
    const { id } = validateType(testIdParamsSchema, req.params);
    const studentId = req.loggedInUser.id;

    // First, fetch the test result to get the selected answers
    const testResult = await findTestResultById(id);
    if (!testResult) {
        throw new ApiError(404, "Test result not found");
    }

    if (testResult.studentId !== studentId && req.loggedInUser.role !== "admin") {
        throw new ApiError(403, "You are not authorized to view this test result");
    }

    const answersWithQuestions = await getTestResultAnswersWithQuestionDetails(id);

    // Calculate correct answers and prepare detailed question analysis
    const questionAnalysis = answersWithQuestions.map((item) => {
        const isCorrect = item.answer === item.selectedOption;
        return {
            questionId: item.questionId,
            questionText: item.questionText,
            options: item.options,
            selectedOption: item.selectedOption - 1,
            correctOption: item.answer - 1,
            isCorrect: isCorrect
        };
    });

    const correctAnswers = questionAnalysis.filter((q: { isCorrect: any; }) => q.isCorrect).length;

    const response = {
        id: testResult.id,
        totalQuestions: answersWithQuestions.length,
        correctAnswers,
        timeSpent: testResult.timeTaken,
        invalid: testResult.isAutoSubmitted,
        questionAnalysis,
        testId : testResult.testId,
    };

    res.status(200).json(
        new ApiResponse(200, response, "Test result fetched successfully")
    );
};

export {submitTest, getTestResult};
