import { describe, it, expect, mock, beforeAll, afterAll, beforeEach } from "bun:test";

// Mock dependencies
// Create mocks outside to capture calls
const mockFindTopicsByNames = mock((names: string[]) => Promise.resolve([]));
const mockFindTopicByName = mock((name: string) => Promise.resolve(undefined));

const mockLogger = {
  info: mock(),
  warn: mock(),
  error: mock(),
};

// Use mock.module to replace imports
mock.module("../db/helpers/topic.helpers", () => ({
  findTopicsByNames: mockFindTopicsByNames,
  findTopicByName: mockFindTopicByName,
}));

mock.module("../utils/logger", () => ({
  default: mockLogger,
}));

// Import AFTER mocks
import { processExcelData } from "../utils/excelProcessor";

describe("Excel Processor Security", () => {
  beforeEach(() => {
    mockFindTopicsByNames.mockClear();
    mockFindTopicByName.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.error.mockClear();
  });

  it("should prevent optimization failure when 'topics' is missing in a row", async () => {
    // If one row is bad, the optimization should still work for other rows
    // This prevents a single bad row from degrading performance for the whole batch
    const rows = [
      {
          question: "Q1", option_1: "A", option_2: "B", option_3: "C", option_4: "D",
          answer: 1, subject: "S1", standard: 1,
          topics: "Valid Topic"
      },
      {
          question: "Q2", option_1: "A", option_2: "B", option_3: "C", option_4: "D",
          answer: 1, subject: "S1", standard: 1,
          // topics is missing!
      }
    ];

    await processExcelData(rows);

    // Should NOT have logged "Failed to batch fetch topics" warning
    // Current behavior: It crashes inside the try block, catches error, and logs warning.
    // Desired behavior: It skips the bad row inside the loop and continues processing valid topics.
    const warnCalls = mockLogger.warn.mock.calls.map(c => c[0]);
    expect(warnCalls).not.toContain("Failed to batch fetch topics, falling back to individual lookups");

    // It should have called findTopicsByNames for the valid topic
    expect(mockFindTopicsByNames).toHaveBeenCalled();
    const calledTopics = mockFindTopicsByNames.mock.calls[0][0];
    expect(calledTopics).toContain("valid topic");
  });

  it("should batch topic lookups to avoid huge SQL queries", async () => {
    // Generate 2500 unique topics
    const rows = [];
    for (let i = 0; i < 2500; i++) {
        rows.push({
          question: `Q${i}`,
          option_1: "A",
          option_2: "B",
          option_3: "C",
          option_4: "D",
          answer: 1,
          subject: "Subject",
          standard: 1,
          topics: `topic_${i}`
        });
    }

    await processExcelData(rows);

    // Current behavior: Called ONCE with 2500 items
    // Desired behavior: Called MULTIPLE times (e.g., chunks of 1000)
    expect(mockFindTopicsByNames.mock.calls.length).toBeGreaterThan(1);

    // Verify total topics requested matches (sanity check)
    let totalRequested = 0;
    for (const call of mockFindTopicsByNames.mock.calls) {
        totalRequested += call[0].length;
    }
    expect(totalRequested).toBe(2500);
  });
});
