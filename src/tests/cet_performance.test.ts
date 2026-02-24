
import { test, expect, mock, afterAll } from 'bun:test';

// Mock missing packages
mock.module('drizzle-orm', () => ({
  eq: () => {},
  inArray: () => {},
  sql: () => {},
  relations: () => {},
}));

mock.module('drizzle-orm/pg-core', () => ({
  pgTable: () => ({
    primaryKey: () => ({}),
    notNull: () => ({}),
    default: () => ({}),
    references: () => ({}),
    $type: () => ({ notNull: () => ({}) }),
  }),
  serial: () => ({ primaryKey: () => ({}) }),
  varchar: () => ({ notNull: () => ({ unique: () => ({}) }) }),
  integer: () => ({ notNull: () => ({}), array: () => ({ notNull: () => ({}) }) }),
  jsonb: () => ({ $type: () => ({ notNull: () => ({}) }) }),
  boolean: () => ({ default: () => ({}) }),
  timestamp: () => ({ defaultNow: () => ({ notNull: () => ({}) }) }),
  pgEnum: () => ({}),
}));

mock.module('winston', () => ({
  createLogger: () => ({
    info: () => {},
    warn: () => {},
    error: () => {},
    add: () => {},
  }),
  format: {
    combine: () => {},
    timestamp: () => {},
    printf: () => {},
    colorize: () => {},
    simple: () => {},
    errors: () => {},
  },
  transports: {
    Console: class {},
    File: class {},
  },
}));

// We use a counter to track calls
let findTopicCallCount = 0;
let batchTopicCallCount = 0;
let questionQueryCount = 0;

// Mock data
const mockDistribution = {
  distributions: Array.from({ length: 5 }, (_, i) => ({
    subject: `Subject ${i}`,
    standard: 10,
    topics: Array.from({ length: 5 }, (_, j) => ({
      topicName: `Topic ${i}-${j}`,
      questionCount: 2,
      marksPerQuestion: 1,
    })),
  })),
};

// Mock dependencies
// Note: We need to use absolute paths or paths relative to the test file that match how the source imports them.
// src/utils/cetQuestionSelector.ts imports from "../db/helpers/..."
// So relative to src/utils/, it is ../db/helpers.
// Relative to src/tests/, it is ../db/helpers.

mock.module('../db/helpers/distribution.helpers', () => ({
  getCETDistribution: async () => mockDistribution,
}));

mock.module('../db/helpers/topic.helpers', () => ({
  findTopicByName: async (name) => {
    findTopicCallCount++;
    await new Promise(resolve => setTimeout(resolve, 10)); // 10ms latency
    return { id: Math.floor(Math.random() * 1000) + 1, topicName: name };
  },
  findTopicsByNames: async (names) => {
    batchTopicCallCount++;
    await new Promise(resolve => setTimeout(resolve, 20)); // 20ms latency
    return names.map((name, index) => ({ id: index + 1000, topicName: name }));
  }
}));

mock.module('../db/helpers/question.helpers', () => ({
  getRandomQuestionIdsFromTopics: async (topicIds, limit) => {
    questionQueryCount++;
    await new Promise(resolve => setTimeout(resolve, 10)); // 10ms latency
    return Array.from({ length: limit }, (_, i) => `q-${topicIds[0]}-${i}`);
  }
}));

test('Benchmark getCETQuestions', async () => {
  findTopicCallCount = 0;
  batchTopicCallCount = 0;
  questionQueryCount = 0;

  // Dynamic import to ensure mocks are applied first
  const { getCETQuestions } = await import('../utils/cetQuestionSelector');

  const start = performance.now();
  try {
    const result = await getCETQuestions();
    const end = performance.now();
    console.log(`\n--- BENCHMARK RESULTS ---`);
    console.log(`Time: ${(end - start).toFixed(2)}ms`);
    console.log(`findTopicByName calls: ${findTopicCallCount}`);
    console.log(`findTopicsByNames calls: ${batchTopicCallCount}`);
    console.log(`getRandomQuestionIdsFromTopics calls: ${questionQueryCount}`);
    console.log(`Total questions: ${result.questionIds.length}`);
    console.log(`-------------------------\n`);

    expect(result.questionIds.length).toBeGreaterThan(0);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

afterAll(() => {
  mock.restore();
});
