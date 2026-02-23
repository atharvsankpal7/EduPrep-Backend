import { describe, it, expect, mock } from "bun:test";

// Mock distribution
mock.module("../db/helpers/distribution.helpers", () => {
  return {
    getCETDistribution: async () => ({
      distributions: [
        {
          subject: "Physics",
          topics: [
            { topicName: "T1", questionCount: 5, marksPerQuestion: 1 },
            { topicName: "T2", questionCount: 5, marksPerQuestion: 1 },
          ],
        },
        {
          subject: "Chemistry",
          topics: [
            { topicName: "T3", questionCount: 5, marksPerQuestion: 1 },
            { topicName: "T4", questionCount: 5, marksPerQuestion: 1 },
          ],
        },
      ],
    }),
  };
});

// Mock topic helpers
mock.module("../db/helpers/topic.helpers", () => {
  return {
    findTopicByName: async (name: string) => {
      await new Promise((r) => setTimeout(r, 50)); // Latency
      return { id: Math.floor(Math.random() * 1000), topicName: name };
    },
    findTopicsByNames: async (names: string[]) => {
      await new Promise((r) => setTimeout(r, 50)); // Latency
      return names.map((name, i) => ({
        id: Math.floor(Math.random() * 1000) + i,
        topicName: name,
      }));
    },
  };
});

// Mock question helpers
mock.module("../db/helpers/question.helpers", () => {
  return {
    getRandomQuestionIdsFromTopics: async (topicIds: number[], limit: number) => {
      await new Promise((r) => setTimeout(r, 50)); // Latency
      return Array(limit).fill("q-id");
    },
  };
});

// Mock logger
mock.module("../utils/logger", () => {
  return {
    default: {
      info: () => {},
      warn: () => {},
      error: () => {},
    },
  };
});

// Dynamic import
const { getCETQuestions } = await import("../utils/cetQuestionSelector");

describe("Optimization Benchmark", () => {
  it("should select questions with expected latency", async () => {
    const start = performance.now();
    const result = await getCETQuestions();
    const end = performance.now();
    const duration = end - start;

    console.log(`\n---------------------------------------------------`);
    console.log(`Execution Time: ${duration.toFixed(2)}ms`);
    console.log(`---------------------------------------------------\n`);

    expect(result.questionIds.length).toBe(20); // 4 topics * 5 questions
    expect(result.totalMarks).toBe(20); // 4 topics * 5 questions * 1 mark
  });
});
