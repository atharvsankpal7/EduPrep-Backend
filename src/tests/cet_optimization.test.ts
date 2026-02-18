import { describe, it, expect, mock } from "bun:test";

// Mock logger first to avoid resolution issues
mock.module("../utils/logger", () => ({
    default: {
        info: () => {},
        warn: () => {},
        error: () => {},
    },
}));

// Mock DB helpers
const mockGetRandomQuestionIdsFromTopics = mock(async (topicIds: number[], limit: number) => {
    // Return fake IDs based on limit
    return Array.from({ length: limit }, (_, i) => ({ id: `q-${topicIds[0]}-${i}` }));
});

const mockGetRandomQuestionsFromTopics = mock(async () => {
    throw new Error("Should not fetch full questions!");
});

mock.module("../db/helpers/question.helpers", () => {
    return {
        getRandomQuestionIdsFromTopics: mockGetRandomQuestionIdsFromTopics,
        getRandomQuestionsFromTopics: mockGetRandomQuestionsFromTopics,
    };
});

mock.module("../db/helpers/distribution.helpers", () => {
    return {
        getCETDistribution: async () => {
            return {
                distributions: [
                    {
                        subject: "Physics",
                        topics: [
                            {
                                topicId: 101,
                                topicName: "Kinematics",
                                questionCount: 2,
                                marksPerQuestion: 1,
                            },
                        ],
                    },
                ],
            };
        },
    };
});

mock.module("../db/helpers/topic.helpers", () => {
    return {
        findTopicByName: async (name: string) => ({ id: 101, topicName: name }),
    };
});

describe("CET Question Selector Optimization", () => {
    it("should use getRandomQuestionIdsFromTopics instead of fetching full objects", async () => {
        // Dynamic import to verify usage
        const { getCETQuestions } = await import("../utils/cetQuestionSelector");

        const result = await getCETQuestions();

        // Verify result structure
        expect(result).toBeDefined();
        expect(result.questionIds).toHaveLength(2);
        expect(result.questionIds).toContain("q-101-0");
        expect(result.questionIds).toContain("q-101-1");
        expect(result.totalMarks).toBe(2);

        // Verify the optimized helper was called
        expect(mockGetRandomQuestionIdsFromTopics).toHaveBeenCalled();
        expect(mockGetRandomQuestionIdsFromTopics).toHaveBeenCalledTimes(1);

        // Verify the old helper was NOT called
        expect(mockGetRandomQuestionsFromTopics).not.toHaveBeenCalled();

        // Verify arguments
        const args = mockGetRandomQuestionIdsFromTopics.mock.calls[0];
        expect(args[0]).toEqual([101]); // topicId
        expect(args[1]).toBe(2); // limit
    });
});
