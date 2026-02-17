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
        customTestSchema: {},
        companyNameParamsSchema: {},
    };
});

// Mock DB helpers
mock.module("../db/helpers/test.helpers", () => {
    return {
        findTestWithQuestions: async (id: string) => {
            if (id === "test-secure-123") {
                return {
                    id: "test-secure-123",
                    testName: "Security Test",
                    totalDuration: 60,
                    totalQuestions: 1,
                    expiryTime: null,
                    sections: [
                        {
                            sectionName: "Sec Section",
                            sectionDuration: 60,
                            totalQuestions: 1,
                            questions: [
                                {
                                    id: "q1",
                                    questionText: "What is the secret?",
                                    options: ["A", "B", "C", "D"],
                                    answer: 2, // SHOULD NOT BE EXPOSED
                                    explanation: "Because reasons.", // SHOULD NOT BE EXPOSED
                                    questionOrder: 1,
                                }
                            ]
                        }
                    ]
                };
            }
            return null;
        },
        createTestWithSections: async (data: any) => {
             return {
                id: "test-new-123",
                testName: data.testName,
                totalDuration: data.totalDuration,
                totalQuestions: data.totalQuestions,
             };
        },
        // Mocks for other functions used in createCustomTest
        findTopicsByIds: async () => [{id: 1}],
        findTopicsByNames: async () => [{id: 1}],
        getRandomQuestionsFromTopics: async () => [
             {
                id: "q_custom",
                questionText: "Custom Question",
                options: ["1", "2"],
                answer: 0,
                explanation: "Explanation custom",
             }
        ],
    };
});

// Mock other dependencies
mock.module("../db/helpers/topic.helpers", () => ({
    findTopicsByIds: async () => [{id: 1}],
    findTopicsByNames: async () => [{id: 1}],
}));

mock.module("../db/helpers/question.helpers", () => ({
    getRandomQuestionsFromTopics: async () => [
         {
            id: "q_custom",
            questionText: "Custom Question",
            options: ["1", "2"],
            answer: 0,
            explanation: "Explanation custom",
         }
    ],
    getQuestionsWithDetails: async () => [],
}));

mock.module("../utils/cetQuestionSelector", () => ({
    getCETQuestions: async () => ({ questionIds: [] }),
}));

mock.module("../db/helpers/distribution.helpers", () => ({
    getCompanyTestDetails: async () => ({}),
}));

mock.module("../utils/logger", () => ({
    default: {
        info: () => {},
        error: () => {},
        warn: () => {},
        debug: () => {},
    },
}));

describe("Security Tests: Data Leakage Prevention", () => {
    it("getTestWithId should NOT return answers or explanations", async () => {
        const { getTestWithId } = await import("../controllers/test.controller");

        const mockReq = {
            params: { id: "test-secure-123" },
            loggedInUser: { id: 1 },
        } as unknown as Request;

        const mockRes = {
            status: mock((code: number) => mockRes),
            send: mock((body: any) => body), // Use send instead of json as per controller code
        } as unknown as Response;

        await getTestWithId(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        const responseBody = (mockRes.send as any).mock.lastCall[0];

        const testData = responseBody.data.test;
        const questions = testData.sections[0].questions;
        const question = questions[0];

        expect(question.id).toBe("q1");
        expect(question.options).toBeDefined();
        // These should be undefined
        expect(question.answer).toBeUndefined();
        expect(question.explanation).toBeUndefined();
    });

    it("createCustomTest should NOT return answers or explanations", async () => {
         const { getCustomTest } = await import("../controllers/test.controller");

         const mockReq = {
             body: {
                 time: 60,
                 numberOfQuestions: 1,
                 topicList: ["1"],
             },
             loggedInUser: { id: 1 },
         } as unknown as Request;

         const mockRes = {
             status: mock((code: number) => mockRes),
             send: mock((body: any) => body),
         } as unknown as Response;

         await getCustomTest(mockReq, mockRes);

         expect(mockRes.status).toHaveBeenCalledWith(201);
         const responseBody = (mockRes.send as any).mock.lastCall[0];

         const testDetails = responseBody.data.testDetails;
         const questions = testDetails.sections[0].questions;
         const question = questions[0];

         expect(question._id).toBe("q_custom");
         // These should be undefined
         expect(question.answer).toBeUndefined();
         expect(question.explanation).toBeUndefined();
    });
});
