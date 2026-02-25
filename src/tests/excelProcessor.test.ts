import { describe, expect, test, mock, beforeAll } from "bun:test";

// Mock the topic helper module
mock.module("../db/helpers/topic.helpers", () => {
  return {
    findTopicsByNames: async (names: string[]) => {
      // Simulate finding all topics
      return names.map((name, idx) => ({
        id: idx + 100, // predictable IDs
        topicName: name,
      }));
    },
    findTopicByName: async (name: string) => {
      return { id: 999, topicName: name };
    },
  };
});

// Mock logger
mock.module("../utils/logger", () => {
  return {
    default: {
      warn: () => {},
      error: () => {},
      info: () => {},
    },
  };
});

// Mock Zod Schema to bypass Zod dependency issues
mock.module("../ZodSchema/excelSchema", () => {
  return {
    ExcelRowSchema: {
        safeParse: (row: any) => {
            // Simplified validation logic for testing
            if (row && row.question && row.topics) {
                return {
                    success: true,
                    data: {
                        ...row,
                        // Simulate the transform in real schema
                        topics: String(row.topics).toLowerCase(),
                        subject: String(row.subject).toLowerCase(),
                    }
                };
            }
            return { success: false, error: "Invalid" };
        }
    }
  };
});

describe("processExcelData", () => {
  let processExcelData: any;

  beforeAll(async () => {
      const mod = await import("../utils/excelProcessor");
      processExcelData = mod.processExcelData;
  });

  test("should process valid rows correctly", async () => {
    const rows = [
      {
        question: "What is 1+1?",
        option_1: "1",
        option_2: "2",
        option_3: "3",
        option_4: "4",
        answer: 2,
        subject: "Math",
        topics: "Arithmetic",
        standard: 10,
        explanation: "Simple addition",
      },
      {
        question: "What is 2+2?",
        option_1: "3",
        option_2: "4",
        option_3: "5",
        option_4: "6",
        answer: 2,
        subject: "Math",
        topics: "Geometry",
        standard: 10,
      },
    ];

    const result = await processExcelData(rows);

    expect(result).toHaveLength(2);
    expect(result[0].questionText).toBe("What is 1+1?");
    expect(result[0].topicId).toBe(100);
    expect(result[1].questionText).toBe("What is 2+2?");
    expect(result[1].topicId).toBe(101);
  });

  test("should handle duplicate topics efficiently", async () => {
     const rows = [
      {
        question: "Q1",
        option_1: "1", option_2: "2", option_3: "3", option_4: "4",
        answer: 1, subject: "S", topics: "Common", standard: 1
      },
      {
        question: "Q2",
        option_1: "1", option_2: "2", option_3: "3", option_4: "4",
        answer: 1, subject: "S", topics: "Common", standard: 1
      }
    ];

    const result = await processExcelData(rows);
    expect(result).toHaveLength(2);
    // Both should get same topic ID (e.g. 100 for 'common')
    expect(result[0].topicId).toBe(100);
    expect(result[1].topicId).toBe(100);
  });
});
