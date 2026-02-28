import { describe, it, expect, mock } from "bun:test";

const ITERATIONS = 10000;

const mockDb = {
  select: mock((...args) => mockDb),
  from: mock((...args) => mockDb),
  where: mock((...args) => {
    return Promise.resolve(Array.from({ length: 100 }).map((_, i) => ({ id: `id-${i}` })));
  }),
  orderBy: mock((...args) => mockDb),
  limit: mock((limit) => {
      return Promise.resolve(Array.from({ length: limit }).map((_, i) => ({ id: `id-${i}` })));
  }),
  execute: mock((...args) => {
      return Promise.resolve({ rows: Array.from({ length: 10 }).map((_, i) => ({ id: `id-${i}` })) });
  })
};

// We will mock drizzle-orm and test how fast it generates the SQL
mock.module("drizzle-orm", () => ({
  inArray: (column, values) => ({ _type: 'inArray', column, values }),
  eq: (column, value) => ({ _type: 'eq', column, value }),
  sql: (...args) => ({ _type: 'sql', args }),
  relations: () => ({}),
}));

const mockChainable = (name) => {
  const obj = { name };
  const methods = ['primaryKey', 'notNull', 'array', 'defaultNow', 'references', 'unique', 'default', 'defaultRandom', '$type'];
  for (const method of methods) {
    obj[method] = () => obj;
  }
  return obj;
};

mock.module("drizzle-orm/pg-core", () => ({
  pgTable: (name, columns, extra) => {
    const table = { _name: name };
    for (const [key, val] of Object.entries(columns)) {
        table[key] = typeof val === 'function' ? val() : { _name: key };
    }
    return table;
  },
  uuid: mockChainable,
  integer: mockChainable,
  text: mockChainable,
  varchar: mockChainable,
  timestamp: mockChainable,
  index: (name) => ({ on: () => ({}) }),
  pgEnum: (name, vals) => (colName) => mockChainable(colName),
  serial: mockChainable,
  jsonb: mockChainable,
  boolean: mockChainable,
  uniqueIndex: (name) => ({ on: () => ({}) }),
}));

mock.module("../db/connection", () => ({
    db: mockDb
}));

describe("Benchmark getRandomQuestionIdsFromTopics", () => {
  it("should measure baseline performance of query generation", async () => {
    const { getRandomQuestionIdsFromTopics } = await import("../db/helpers/question.helpers");

    // reset mocks
    mockDb.select.mockClear();
    mockDb.from.mockClear();
    mockDb.where.mockClear();
    mockDb.orderBy.mockClear();
    mockDb.limit.mockClear();
    mockDb.execute.mockClear();

    const start = performance.now();

    for (let i = 0; i < ITERATIONS; i++) {
        await getRandomQuestionIdsFromTopics([1, 2, 3], 10);
    }

    const end = performance.now();

    console.log(`Query generation + JS random shuffle for ${ITERATIONS} iterations took ${end - start}ms`);
  });
});
