import { describe, it, expect, mock } from "bun:test";
import { ApiError } from "../utils/ApiError";

// Mock Zod schemas (empty objects) before import
mock.module("../ZodSchema/testSchema", () => {
    return {
        submitTestBodySchema: {},
        testIdParamsSchema: {},
    };
});

// Mock validateType (so we don't need real Zod checks in test)
mock.module("../utils/zodValidator", () => {
    return {
        validateType: (schema: any, data: any) => data, // Pass through
    };
});

// Mock the database helpers
mock.module("../db/helpers/test.helpers", () => {
    return {
        findTestResultById: (id: string) => {
            if (id === "valid-result-id") {
                return Promise.resolve({
                    id: "valid-result-id",
                    testId: "test-id-1",
                    studentId: 999, // Different from logged in user (1)
                    score: 80,
                    timeTaken: 120,
                    isAutoSubmitted: false,
                    tabSwitches: 0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
            }
            return Promise.resolve(null);
        },
        getTestResultAnswersWithQuestionDetails: (id: string) => {
             return Promise.resolve([
                {
                    questionId: "q1",
                    questionText: "What is 2+2?",
                    options: ["1", "2", "3", "4"],
                    answer: 4,
                    selectedOption: 4,
                    sectionId: "s1"
                }
             ]);
        },
        // Provide dummy implementations for other exports used in the controller file or its imports
        findTestById: () => Promise.resolve(null),
        getTestQuestionInfo: () => Promise.resolve([]),
        createTestResultWithAnswers: () => Promise.resolve({}),
    };
});

// Mock ApiError class
mock.module("../utils/ApiError", () => {
    return {
        ApiError: class ApiError extends Error {
            statusCode: number;
            constructor(statusCode: number, message: string) {
                super(message);
                this.statusCode = statusCode;
            }
        }
    };
});


// Mock ApiResponse (simple function)
mock.module("../utils/ApiResponse", () => {
    return {
        default: class ApiResponse {
            statusCode: number;
            data: any;
            message: string;
            success: boolean;
            constructor(statusCode: number, data: any, message: string = "Success") {
                this.statusCode = statusCode;
                this.data = data;
                this.message = message;
                this.success = statusCode < 400;
            }
        }
    };
});

// Dynamic import after mocks
const { getTestResult } = await import("../controllers/testResult.controller");

describe("IDOR Vulnerability in Test Results", () => {
    it("should deny access when a user tries to fetch another user's test result (fix verification)", async () => {
        const req = {
            params: { id: "valid-result-id" },
            loggedInUser: { id: 1, role: "student" }, // User ID 1 tries to access User ID 999's result
        } as any;

        const res = {
            status: mock((code: number) => {
                return {
                    json: mock((data: any) => {
                         // Should NOT be called for success
                    })
                }
            })
        } as any;

        let caughtError: any;
        try {
            await getTestResult(req, res);
        } catch (error: any) {
            caughtError = error;
        }

        // Assert that we caught an error and it's a 403 Forbidden
        expect(caughtError).toBeDefined();
        expect(caughtError.statusCode).toBe(403);
        expect(caughtError.message).toBe("You are not authorized to view this test result");

        // Ensure status 200 was NOT called
        expect(res.status).not.toHaveBeenCalled();
    });

    it("should allow access if the user is an admin", async () => {
        const req = {
            params: { id: "valid-result-id" },
            loggedInUser: { id: 2, role: "admin" }, // Admin user
        } as any;

         const res = {
            status: mock((code: number) => {
                return {
                    json: mock((data: any) => {
                        expect(code).toBe(200);
                        expect(data.data.id).toBe("valid-result-id");
                    })
                }
            })
        } as any;

        await getTestResult(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should allow access if the user owns the result", async () => {
         const req = {
            params: { id: "valid-result-id" },
            loggedInUser: { id: 999, role: "student" }, // Owner user
        } as any;

         const res = {
            status: mock((code: number) => {
                return {
                    json: mock((data: any) => {
                        expect(code).toBe(200);
                        expect(data.data.id).toBe("valid-result-id");
                    })
                }
            })
        } as any;

        await getTestResult(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });
});
