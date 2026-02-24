import { describe, it, expect, mock } from "bun:test";
import { ApiError } from "../utils/ApiError";

// Mock drizzle-orm to prevent resolution errors
mock.module("drizzle-orm", () => ({
    eq: () => {},
    and: () => {},
    desc: () => {},
    sql: () => {},
    inArray: () => {},
    asc: () => {},
    relations: () => {},
}));

mock.module("drizzle-orm/pg-core", () => ({
    pgTable: () => ({ primaryKey: () => ({ defaultRandom: () => {} }) }),
    uuid: () => ({ primaryKey: () => ({ defaultRandom: () => {} }) }),
    varchar: () => {},
    text: () => {},
    timestamp: () => {},
    integer: () => {},
    boolean: () => {},
    index: () => {},
    pgEnum: () => {},
    serial: () => {},
}));

// Mock zod to prevent resolution errors
mock.module("zod", () => ({
    z: {
        object: () => ({}),
        string: () => ({ uuid: () => ({}), trim: () => ({}), min: () => ({}) }),
        coerce: {
            number: () => ({ int: () => ({ min: () => ({ max: () => ({}) }), nonnegative: () => ({ default: () => ({}) }), positive: () => ({}) }), }),
            boolean: () => ({ default: () => ({}) })
        },
        array: () => ({ min: () => ({}) }),
    }
}));

// Mock zod and schema helpers
mock.module("../utils/zodValidator", () => ({
    validateType: (schema: any, obj: any) => {
        // Bypass validation for test
        return obj;
    }
}));

mock.module("../ZodSchema/testSchema", () => ({
    testIdParamsSchema: {},
    submitTestBodySchema: {},
}));

// Mock the DB helpers
mock.module("../db/helpers/test.helpers", () => {
    return {
        findTestResultById: (id: string) => {
            if (id === "123e4567-e89b-12d3-a456-426614174000") {
                 return Promise.resolve({
                    id: "123e4567-e89b-12d3-a456-426614174000",
                    studentId: 999, // Owned by user 999
                    testId: "test-uuid",
                    timeTaken: 100,
                    isAutoSubmitted: false,
                    score: 10
                 });
            }
            return Promise.resolve(null);
        },
        getTestResultAnswersWithQuestionDetails: (id: string) => {
             return Promise.resolve([
                 {
                     questionId: "q1",
                     questionText: "What is 1+1?",
                     options: ["1", "2", "3", "4"],
                     selectedOption: 2,
                     answer: 2
                 }
             ]);
        },
        findTestById: () => Promise.resolve({}),
        getTestQuestionInfo: () => Promise.resolve([]),
        createTestResultWithAnswers: () => Promise.resolve({})
    };
});

// Mock logger
mock.module("../utils/logger", () => {
    return {
        default: {
            info: () => {},
            error: () => {},
            warn: () => {}
        }
    };
});

describe("IDOR Protection in getTestResult", () => {
    it("should allow access to own test result", async () => {
        const { getTestResult } = await import("../controllers/testResult.controller");
        const req = {
            params: { id: "123e4567-e89b-12d3-a456-426614174000" },
            loggedInUser: { id: 999, role: 'student' }
        } as any;

        const res = {
            status: mock(() => res),
            json: mock(() => res),
            send: mock(() => res)
        } as any;

        await getTestResult(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should prevent unauthorized access to test result", async () => {
        const { getTestResult } = await import("../controllers/testResult.controller");
        const req = {
            params: { id: "123e4567-e89b-12d3-a456-426614174000" }, // Result owned by 999
            loggedInUser: { id: 1, role: 'student' } // Accessing as user 1
        } as any;

        const res = {
            status: mock(() => res),
            json: mock(() => res),
            send: mock(() => res)
        } as any;

        let error: any;
        try {
            await getTestResult(req, res);
        } catch (e) {
            error = e;
        }

        // This should throw 403. If it doesn't (current state), this expectation fails.
        expect(error).toBeDefined();
        if (error) {
            expect(error.statusCode).toBe(403);
            expect(error.message).toContain("not authorized");
        }
    });

    it("should allow admin access to any test result", async () => {
        const { getTestResult } = await import("../controllers/testResult.controller");
        const req = {
            params: { id: "123e4567-e89b-12d3-a456-426614174000" }, // Result owned by 999
            loggedInUser: { id: 1, role: 'admin' } // Accessing as admin
        } as any;

        const res = {
            status: mock(() => res),
            json: mock(() => res),
            send: mock(() => res)
        } as any;

        await getTestResult(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });
});
