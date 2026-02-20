import { describe, it, expect, mock } from "bun:test";

const chain = {
  from: mock(() => chain),
  where: mock(() => chain),
  orderBy: mock(() => chain),
  limit: mock(() => Promise.resolve([{ id: 'q1' }, { id: 'q2' }])),
  then: (resolve: any) => resolve([{ id: 'q1', questionText: 'Q1' }, { id: 'q2', questionText: 'Q2' }])
};

const mockDb = {
  select: mock(() => chain),
};

mock.module("../../../src/db/connection", () => ({
  db: mockDb
}));

mock.module("drizzle-orm", () => ({
  eq: mock(() => ({})),
  inArray: mock(() => ({})),
  sql: (strings: TemplateStringsArray) => ({ sql: strings[0] }),
  relations: mock(() => ({})),
}));

mock.module("drizzle-orm/pg-core", () => ({
  pgTable: mock(() => ({})),
  uuid: mock(() => ({ primaryKey: () => ({ defaultRandom: () => ({}) }), notNull: () => ({ references: () => ({}) }), references: () => ({}) })),
  varchar: mock(() => ({ notNull: () => ({ unique: () => ({}) }), unique: () => ({}), primaryKey: () => ({}) })),
  text: mock(() => ({ array: () => ({ notNull: () => ({}) }), notNull: () => ({}) })),
  timestamp: mock(() => ({ defaultNow: () => ({ notNull: () => ({}) }) })),
  integer: mock(() => ({ notNull: () => ({ references: () => ({}) }), default: () => ({ notNull: () => ({}) }), array: () => ({ notNull: () => ({}) }) })),
  index: mock(() => ({ on: () => ({}) })),
  pgEnum: mock(() => () => ({ default: () => ({ notNull: () => ({}) }) })),
  serial: mock(() => ({ primaryKey: () => ({}) })),
  jsonb: mock(() => ({ $type: () => ({ notNull: () => ({}) }), notNull: () => ({}) })),
  boolean: mock(() => ({ default: () => ({ notNull: () => ({}) }) })),
}));

describe("getRandomQuestionsFromTopics", () => {
  it("should fetch random questions using two-step process", async () => {
    const { getRandomQuestionsFromTopics } = await import("../../../src/db/helpers/question.helpers");
    mockDb.select.mockClear();

    const questions = await getRandomQuestionsFromTopics([1, 2], 2);

    expect(questions).toHaveLength(2);
    expect(questions[0].id).toBe('q1');

    // Expect 2 calls:
    // 1. Fetch IDs
    // 2. Fetch details
    expect(mockDb.select).toHaveBeenCalledTimes(2);
  });

  it("should fetch random question IDs", async () => {
    const { getRandomQuestionIdsFromTopics } = await import("../../../src/db/helpers/question.helpers");
    mockDb.select.mockClear();

    const ids = await getRandomQuestionIdsFromTopics([1, 2], 2);

    expect(ids).toHaveLength(2);
    expect(ids[0]).toBe('q1');

    // Expect 1 call:
    // 1. Fetch IDs
    expect(mockDb.select).toHaveBeenCalledTimes(1);
  });
});
