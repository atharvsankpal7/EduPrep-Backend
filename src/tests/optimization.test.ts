import { describe, it, expect, mock } from "bun:test";
import { Request, Response } from "express";

// Mock 'zod' package globally
mock.module("zod", () => {
    return {
        z: {
            object: () => ({ parse: (o: any) => o }),
            string: () => ({ optional: () => ({}) }),
            number: () => ({}),
            boolean: () => ({}),
            array: () => ({}),
            infer: {},
        }
    };
});

// Mock local modules
mock.module("../utils/zodValidator", () => {
    return {
        validateType: (schema: any, obj: any) => obj,
    };
});

mock.module("../ZodSchema/testSchema", () => {
    return {
        testIdParamsSchema: {},
        submitTestBodySchema: {},
    };
});

// Mock DB helpers
mock.module("../db/helpers/test.helpers", () => {
    return {
        findTestResultById: async (id: string) => {
            if (id === "test-result-123") {
                return {
                    id: "test-result-123",
                    testId: "test-123",
                    studentId: 1,
                    timeTaken: 100,
                    isAutoSubmitted: false,
                    tabSwitches: 0,
                };
            }
            return null;
        },
        getTestResultAnswersWithQuestionDetails: async (id: string) => {
            if (id === "test-result-123") {
                return [
                    {
                        questionId: "q1",
                        selectedOption: 2, // User selected option 2 (index 1)
                        sectionId: "s1",
                        questionText: "What is 1+1?",
                        options: ["1", "2", "3", "4"],
                        answer: 2, // Correct answer is option 2 (index 1)
                    },
                    {
                        questionId: "q2",
                        selectedOption: 3, // User selected option 3 (index 2)
                        sectionId: "s1",
                        questionText: "What is 2+2?",
                        options: ["2", "3", "4", "5"],
                        answer: 4, // Correct answer is option 4 (index 3)
                    }
                ];
            }
            return [];
        },
        // Additional mocks needed for imports
        getTestQuestionInfo: async () => [],
        createTestResultWithAnswers: async () => {},
        findTestById: async () => {},
        getTestResultAnswers: async () => {},
    };
});

describe("Optimized getTestResult", () => {
    it("should return correct test result with analysis", async () => {
        // Dynamic import to ensure mocks are applied first
        const { getTestResult } = await import("../controllers/testResult.controller");

        // Mock Request and Response
        const mockReq = {
            params: { id: "test-result-123" },
            loggedInUser: { id: 1 },
        } as unknown as Request;

        const mockRes = {
            status: mock((code: number) => mockRes),
            json: mock((body: any) => body),
        } as unknown as Response;

        await getTestResult(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);

        // Use checking the last call to json
        const responseBody = (mockRes.json as any).mock.lastCall[0];

        expect(responseBody.statusCode).toBe(200);
        expect(responseBody.message).toBe("Test result fetched successfully");

        const data = responseBody.data;
        expect(data.id).toBe("test-result-123");
        expect(data.totalQuestions).toBe(2);

        // q1: selected 2 (index 1), correct 2 (index 1). Correct.
        // q2: selected 3 (index 2), correct 4 (index 3). Incorrect.
        expect(data.correctAnswers).toBe(1);

        expect(data.questionAnalysis).toHaveLength(2);

        const q1 = data.questionAnalysis[0];
        expect(q1.questionId).toBe("q1");
        expect(q1.selectedOption).toBe(1); // 2 - 1
        expect(q1.correctOption).toBe(1); // 2 - 1
        expect(q1.isCorrect).toBe(true);

        const q2 = data.questionAnalysis[1];
        expect(q2.questionId).toBe("q2");
        expect(q2.selectedOption).toBe(2); // 3 - 1
        expect(q2.correctOption).toBe(3); // 4 - 1
        expect(q2.isCorrect).toBe(false);
    });
});
