import { describe, it, expect, mock } from "bun:test";

// Mock logger
mock.module("../utils/logger", () => ({
    default: {
        warn: () => {},
        error: () => {},
        info: () => {},
    }
}));

// Mock DB helpers needed for getCETQuestions
mock.module("../db/helpers/distribution.helpers", () => ({
    getCETDistribution: async () => ({
        distributions: [
            {
                subjectName: "Physics",
                topics: [
                    { topicName: "Motion", topicId: 1, questionCount: 2, marksPerQuestion: 1 }
                ]
            }
        ]
    })
}));

mock.module("../db/helpers/topic.helpers", () => ({
    findTopicByName: async (name: string) => {
        if (name === "Motion") return { id: 1, topicName: "Motion" };
        return null;
    }
}));

// Mock DB Connection
const mockDb = {
    select: mock(() => ({
        from: mock(() => ({
            where: mock(() => ({
                orderBy: mock(() => ({
                    limit: mock(async () => {
                         // This simulates getRandomQuestionIdsFromTopics response from DB
                         return [{ id: "q1" }, { id: "q2" }];
                    })
                }))
            }))
        }))
    }))
};

mock.module("../db/connection", () => ({
    db: mockDb
}));

// Also need to mock schema/drizzle-orm because question.helpers uses them
mock.module("drizzle-orm", () => ({
    eq: () => {},
    inArray: () => {},
    sql: (strings: any) => strings,
}));

mock.module("../db/schema", () => ({
    questions: { id: {}, topicId: {} },
    topics: {},
    subjects: {},
}));


describe("Optimized CET Question Selector", () => {
    it("should fetch question IDs without fetching full question details", async () => {
        const { getCETQuestions } = await import("../utils/cetQuestionSelector");

        const result = await getCETQuestions();

        expect(result.questionIds).toEqual(["q1", "q2"]);
        expect(result.totalMarks).toBe(2);

        // Verify that db.select was called (at least once)
        expect(mockDb.select).toHaveBeenCalled();
    });
});
