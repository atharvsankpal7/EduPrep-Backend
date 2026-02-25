import { describe, it, expect, mock } from "bun:test";

// Mock Zod schemas
mock.module("../ZodSchema/testSchema", () => {
    return {
        testIdParamsSchema: {},
        submitTestBodySchema: {},
    };
});

// Mock zodValidator
mock.module("../utils/zodValidator", () => {
    return {
        validateType: (schema: any, obj: any) => obj, // Pass through
    };
});

// Mock database helpers
const mockTestResult = {
    id: "test-result-123",
    testId: "test-abc",
    studentId: 999, // User A (victim)
    timeTaken: 100,
    isAutoSubmitted: false,
    tabSwitches: 0,
    score: 10,
    createdAt: new Date(),
};

mock.module("../db/helpers/test.helpers", () => {
    return {
        findTestResultById: () => Promise.resolve(mockTestResult),
        getTestResultAnswersWithQuestionDetails: () => Promise.resolve([]),
        createTestResultWithAnswers: () => Promise.resolve({}),
        findTestById: () => Promise.resolve({}),
        getTestQuestionInfo: () => Promise.resolve([]),
    };
});

// Import the controller (after mocking)
const { getTestResult } = await import("../controllers/testResult.controller");

describe("IDOR Vulnerability in getTestResult", () => {
    it("should BLOCK access to another user's result (403 Forbidden)", async () => {
        const req = {
            params: { id: "test-result-123" },
            loggedInUser: { id: 1, role: "student" }, // User B (attacker)
        } as any;

        let responseStatus;
        let responseData;

        const res = {
            status: (code: number) => {
                responseStatus = code;
                return {
                    json: (data: any) => {
                        responseData = data;
                    },
                    send: (data: any) => {
                        responseData = data;
                    }
                };
            }
        } as any;

        try {
            await getTestResult(req, res);

            // If we reach here, it failed to block (vulnerable)
            // But we expect it to throw an ApiError(403)
            expect(responseStatus).not.toBe(200);

        } catch (error: any) {
            // Should throw 403 Forbidden
            expect(error.statusCode).toBe(403);
            expect(error.message).toContain("authorized");
        }
    });

    it("should ALLOW access to own result", async () => {
        const req = {
            params: { id: "test-result-123" },
            loggedInUser: { id: 999, role: "student" }, // User A (owner)
        } as any;

        let responseStatus;
        const res = {
            status: (code: number) => {
                responseStatus = code;
                return { json: () => {} };
            }
        } as any;

        try {
            await getTestResult(req, res);
            expect(responseStatus).toBe(200);
        } catch (error) {
            expect(error).toBeUndefined();
        }
    });

    it("should ALLOW access to ADMIN", async () => {
        const req = {
            params: { id: "test-result-123" },
            loggedInUser: { id: 1, role: "admin" }, // Admin
        } as any;

        let responseStatus;
        const res = {
            status: (code: number) => {
                responseStatus = code;
                return { json: () => {} };
            }
        } as any;

        try {
            await getTestResult(req, res);
            expect(responseStatus).toBe(200);
        } catch (error) {
            expect(error).toBeUndefined();
        }
    });
});
