import { describe, it, expect, mock } from "bun:test";

const TEST_RESULT_ID = "00000000-0000-0000-0000-000000000000";
const OWNER_USER_ID = 2;
const ATTACKER_USER_ID = 1;

// Mock dependencies
const mockFindTestResultById = mock((id: string) => {
    if (id === TEST_RESULT_ID) {
        return Promise.resolve({
            id: TEST_RESULT_ID,
            studentId: OWNER_USER_ID, // The result belongs to user 2
            testId: "test-uuid",
            score: 10,
            timeTaken: 100,
            isAutoSubmitted: false,
            tabSwitches: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }
    return Promise.resolve(undefined);
});

const mockGetTestResultAnswersWithQuestionDetails = mock(() => Promise.resolve([]));

mock.module("../db/helpers/test.helpers", () => ({
    findTestResultById: mockFindTestResultById,
    getTestResultAnswersWithQuestionDetails: mockGetTestResultAnswersWithQuestionDetails,
    createTestResultWithAnswers: mock(() => Promise.resolve({})),
    findTestById: mock(() => Promise.resolve({})),
    getTestQuestionInfo: mock(() => Promise.resolve([])),
}));

// Mock logger
mock.module("../utils/logger", () => ({
    default: {
        info: () => {},
        error: () => {},
        warn: () => {},
    }
}));

// Mock ApiError
class MockApiError extends Error {
    statusCode: number;
    constructor(statusCode: number, message: string) {
        super(message);
        this.statusCode = statusCode;
    }
}

mock.module("../utils/ApiError", () => ({
    ApiError: MockApiError
}));

// Mock Zod and Validator to avoid dependency issues
mock.module("../utils/zodValidator", () => ({
    validateType: (schema: any, data: any) => data
}));

mock.module("../ZodSchema/testSchema", () => ({
    testIdParamsSchema: {},
    submitTestBodySchema: {}
}));


// Import controller dynamically after mocks
const { getTestResult } = await import("../controllers/testResult.controller");

describe("Test Result IDOR Security", () => {
    it("should prevent accessing another user's test result", async () => {
        const req = {
            params: { id: TEST_RESULT_ID },
            loggedInUser: { id: ATTACKER_USER_ID, role: "student" }
        } as any;

        const res = {
            status: mock(() => res),
            json: mock(() => res),
        } as any;

        let error: any;
        try {
            await getTestResult(req, res);
        } catch (e) {
            error = e;
        }

        // This expectation will FAIL before the fix
        expect(error).toBeDefined();
        if (error) {
             expect(error.statusCode).toBe(403);
             expect(error.message).toBe("Unauthorized access to test result");
        }
    });

    it("should allow accessing own test result", async () => {
        const req = {
            params: { id: TEST_RESULT_ID },
            loggedInUser: { id: OWNER_USER_ID, role: "student" } // Same user as result owner
        } as any;

        const res = {
            status: mock(() => res),
            json: mock(() => res),
        } as any;

        await getTestResult(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should allow admin accessing any test result", async () => {
         const req = {
            params: { id: TEST_RESULT_ID },
            loggedInUser: { id: ATTACKER_USER_ID, role: "admin" } // Admin user
        } as any;

        const res = {
            status: mock(() => res),
            json: mock(() => res),
        } as any;

        await getTestResult(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
    });
});
