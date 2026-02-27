import { describe, it, expect, mock } from "bun:test";
import { Request, Response } from "express";
import { ApiError } from "../utils/ApiError";

// Mock Zod again because bun test environment seems to have trouble resolving it when imported from other files
// This is a known issue with some bundlers/environments where package resolution differs for tests
const zodSchema = {
    parse: (data: any) => data,
    safeParse: (data: any) => ({ success: true, data }),
    optional: () => zodSchema,
    min: () => zodSchema,
    max: () => zodSchema,
    int: () => zodSchema,
    positive: () => zodSchema,
    nonnegative: () => zodSchema,
    default: () => zodSchema,
    uuid: () => zodSchema,
    trim: () => zodSchema,
    coerce: {
        number: () => zodSchema,
        boolean: () => zodSchema,
        string: () => zodSchema,
    },
    array: () => zodSchema,
    object: () => zodSchema,
    string: () => zodSchema,
    number: () => zodSchema,
    boolean: () => zodSchema,
    enum: () => zodSchema,
    union: () => zodSchema,
    refine: () => zodSchema,
    transform: () => zodSchema,
    pipe: () => zodSchema,
};

mock.module("zod", () => {
  return { z: zodSchema };
});

// Mock zod validator
mock.module("../utils/zodValidator", () => {
    return {
        validateType: (schema: any, data: any) => data,
    };
});

// Mock database helpers
mock.module("../db/helpers/test.helpers", () => {
    return {
        findTestResultById: (id: string) => {
            if (id === "test-result-1") {
                return Promise.resolve({
                    id: "test-result-1",
                    testId: "test-1",
                    studentId: 1, // Owned by user 1
                    score: 10,
                    timeTaken: 100,
                    isAutoSubmitted: false,
                    tabSwitches: 0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
            }
            return Promise.resolve(null);
        },
        getTestResultAnswersWithQuestionDetails: (id: string) => {
            return Promise.resolve([]);
        },
        createTestResultWithAnswers: () => Promise.resolve({}),
        findTestById: () => Promise.resolve({}),
        getTestQuestionInfo: () => Promise.resolve([]),
    };
});

// Import the controller AFTER mocking
const { getTestResult } = await import("../controllers/testResult.controller");

describe("IDOR Vulnerability in getTestResult", () => {
    it("should BLOCK a user from accessing another user's test result (403 Forbidden)", async () => {
        const req = {
            params: { id: "test-result-1" },
            loggedInUser: { id: 2, role: "student" }, // Requesting user is NOT owner (id: 2 vs id: 1)
        } as unknown as Request;

        const res = {
            status: mock((code: number) => res),
            json: mock((body: any) => body),
        } as unknown as Response;

        try {
            await getTestResult(req, res);
            expect(true).toBe(false); // Should not reach here
        } catch (error: any) {
            expect(error).toBeInstanceOf(ApiError);
            expect(error.statusCode).toBe(403);
            expect(error.message).toContain("permission");
        }
    });

    it("should ALLOW the owner to access their own test result (200 OK)", async () => {
        const req = {
            params: { id: "test-result-1" },
            loggedInUser: { id: 1, role: "student" }, // Requesting user IS owner (id: 1)
        } as unknown as Request;

        const res = {
            status: mock((code: number) => res),
            json: mock((body: any) => body),
        } as unknown as Response;

        await getTestResult(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalled();
        const jsonCall = (res.json as any).mock.calls[0];
        const responseBody = jsonCall[0];
        expect(responseBody.success).toBe(true);
        expect(responseBody.data.id).toBe("test-result-1");
    });

    it("should ALLOW an admin to access any test result (200 OK)", async () => {
        const req = {
            params: { id: "test-result-1" },
            loggedInUser: { id: 3, role: "admin" }, // Requesting user is admin
        } as unknown as Request;

        const res = {
            status: mock((code: number) => res),
            json: mock((body: any) => body),
        } as unknown as Response;

        await getTestResult(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalled();
        const jsonCall = (res.json as any).mock.calls[0];
        const responseBody = jsonCall[0];
        expect(responseBody.success).toBe(true);
        expect(responseBody.data.id).toBe("test-result-1");
    });
});
