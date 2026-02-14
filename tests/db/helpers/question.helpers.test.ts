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

import { getRandomQuestionsFromTopics } from "../../../src/db/helpers/question.helpers";

describe("getRandomQuestionsFromTopics", () => {
  it("should fetch random questions using two-step process", async () => {
    mockDb.select.mockClear();

    const questions = await getRandomQuestionsFromTopics([1, 2], 2);

    expect(questions).toHaveLength(2);
    expect(questions[0].id).toBe('q1');

    // Expect 2 calls:
    // 1. Fetch IDs
    // 2. Fetch details
    expect(mockDb.select).toHaveBeenCalledTimes(2);
  });
});
