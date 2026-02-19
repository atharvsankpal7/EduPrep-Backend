import { describe, it, expect, mock, afterAll } from "bun:test";

// Mock helpers to isolate DB calls to just question fetching
mock.module("../db/helpers/distribution.helpers", () => {
    return {
        getCETDistribution: async () => ({
            distributions: [
                {
                    subject: "Physics",
                    topics: [
                        {
                            topicName: "Mechanics",
                            questionCount: 2,
                            marksPerQuestion: 1,
                        }
                    ]
                }
            ]
        })
    };
});

mock.module("../db/helpers/topic.helpers", () => {
    return {
        findTopicByName: async (name: string) => ({ id: 101, name })
    };
});

mock.module("../utils/logger", () => {
    return {
        default: {
            info: () => {},
            warn: () => {},
            error: () => {},
        }
    };
});

mock.module("drizzle-orm", () => {
    return {
        eq: () => {},
        inArray: () => {},
        sql: (strings: any) => strings,
        relations: () => {},
    };
});

mock.module("drizzle-orm/pg-core", () => {
    const colMock = () => ({
        primaryKey: colMock,
        notNull: colMock,
        unique: colMock,
        default: colMock,
        defaultNow: colMock,
        $type: colMock,
        array: colMock,
        references: colMock,
        defaultRandom: colMock,
    });

    return {
        pgTable: () => ({ $inferSelect: {}, $inferInsert: {} }),
        serial: colMock,
        varchar: colMock,
        integer: colMock,
        timestamp: colMock,
        boolean: colMock,
        text: colMock,
        jsonb: colMock,
        pgEnum: () => colMock,
        index: () => ({ on: () => {} }),
        uuid: colMock,
    };
});

// Mock DB connection
const mockChain = {
    from: mock(() => mockChain),
    where: mock(() => mockChain),
    orderBy: mock(() => mockChain),
    limit: mock(() => Promise.resolve([{ id: 'q1' }, { id: 'q2' }])),
    leftJoin: mock(() => mockChain),
    then: (resolve: any) => resolve([{ id: 'q1' }, { id: 'q2' }])
};

const mockDb = {
    select: mock(() => mockChain),
    insert: mock(() => mockChain),
};

mock.module("../db/connection", () => {
    return {
        db: mockDb
    };
});

// IMPORTANT: Do NOT mock question.helpers here, so we use the real implementation
// which calls our mocked DB.

afterAll(() => {
    mock.restore();
});

describe("CET Question Optimization", () => {
    it("should use optimized DB query (fetching only IDs)", async () => {
        const { getCETQuestions } = await import("../utils/cetQuestionSelector");

        mockDb.select.mockClear();
        mockChain.limit.mockClear();

        await getCETQuestions();

        // We expect DB select to be called.
        // If optimized:
        // 1. getRandomQuestionIdsFromTopics calls select({id: ...})
        // Total 1 call per topic.

        // If unoptimized:
        // 1. getRandomQuestionsFromTopics calls select({id: ...})
        // 2. getRandomQuestionsFromTopics calls select() (full details)
        // Total 2 calls per topic.

        // We have 1 topic in our mock distribution.
        expect(mockDb.select).toHaveBeenCalledTimes(1);

        // Verify the argument to select was just { id: ... } (or similar structure)
        // The first call's first argument.
        const firstCallArgs = mockDb.select.mock.calls[0];
        // If it was select(), args would be empty or undefined.
        // If it was select({id: ...}), args would be defined.
        expect(firstCallArgs).toBeDefined();
        expect(firstCallArgs.length).toBeGreaterThan(0);

        // Assuming select({ id: questions.id }) passes an object
        const selectedFields = firstCallArgs[0];
        expect(selectedFields).toHaveProperty('id');
        // It should NOT select other fields implicitly if we passed an object.
    });
});
