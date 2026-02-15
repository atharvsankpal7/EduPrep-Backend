import { describe, it, expect, mock } from "bun:test";
import { getRandomQuestionIdsFromTopics } from "../db/helpers/question.helpers";

// We need to hoist the mock factory or use a variable that is accessible.
// However, bun test mock.module works by path.

const mockSelect = mock(() => ({
  from: () => ({
    where: () => ({
      orderBy: () => ({
        limit: () => Promise.resolve([{ id: "test-id-1" }]),
      }),
    }),
  }),
}));

// Mock db
mock.module("../db/connection", () => ({
  db: {
    select: mockSelect,
  },
}));

describe("getRandomQuestionIdsFromTopics", () => {
  it("should select only id field", async () => {
    await getRandomQuestionIdsFromTopics([1], 1);

    // Check if select was called with the correct argument
    expect(mockSelect).toHaveBeenCalled();
    const callArgs = mockSelect.mock.calls[0];

    // The select argument should be an object with 'id' property
    const selectArg = callArgs[0];
    expect(selectArg).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((selectArg as any).id).toBeDefined();

    // Ensure no other fields are selected (like questionText)
    expect(Object.keys(selectArg as object)).toEqual(["id"]);
  });

  it("should return question IDs", async () => {
    const ids = await getRandomQuestionIdsFromTopics([1], 1);
    expect(ids).toEqual([{ id: "test-id-1" }]);
  });
});
