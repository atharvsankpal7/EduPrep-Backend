import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { questions } from './questions';

// Tests table
export const tests = pgTable(
  'tests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    testName: varchar('test_name', { length: 255 }).notNull(),
    totalDuration: integer('total_duration').notNull(), // in minutes
    totalQuestions: integer('total_questions').notNull(),
    expiryTime: timestamp('expiry_time', { withTimezone: true }),
    createdBy: integer('created_by').notNull().references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    createdByIdx: index('tests_created_by_idx').on(table.createdBy),
  })
);

// Test sections table
export const testSections = pgTable(
  'test_sections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    testId: uuid('test_id').notNull().references(() => tests.id),
    sectionName: varchar('section_name', { length: 255 }).notNull(),
    sectionDuration: integer('section_duration').notNull(),
    totalQuestions: integer('total_questions').notNull(),
    sectionOrder: integer('section_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    testIdIdx: index('test_sections_test_idx').on(table.testId),
  })
);

// Test section questions (junction)
export const testSectionQuestions = pgTable(
  'test_section_questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    testSectionId: uuid('test_section_id').notNull().references(() => testSections.id),
    questionId: uuid('question_id').notNull().references(() => questions.id),
    questionOrder: integer('question_order').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    sectionIdx: index('test_section_questions_section_idx').on(table.testSectionId),
    questionIdx: index('test_section_questions_question_idx').on(table.questionId),
  })
);

// Test results table
export const testResults = pgTable(
  'test_results',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    testId: uuid('test_id').notNull().references(() => tests.id, { onDelete: 'cascade' }),
    studentId: integer('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    score: integer('score').notNull(),
    timeTaken: integer('time_taken').notNull(), // in seconds
    isAutoSubmitted: boolean('is_auto_submitted').default(false).notNull(),
    tabSwitches: integer('tab_switches').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    testIdx: index('test_results_test_idx').on(table.testId),
    studentIdx: index('test_results_student_idx').on(table.studentId),
  })
);

// Test result answers
export const testResultAnswers = pgTable(
  'test_result_answers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    testResultId: uuid('test_result_id').notNull().references(() => testResults.id, { onDelete: 'cascade' }),
    questionId: uuid('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
    selectedOption: integer('selected_option').notNull(),
    sectionId: uuid('section_id').references(() => testSections.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    resultIdx: index('test_result_answers_result_idx').on(table.testResultId),
    questionIdx: index('test_result_answers_question_idx').on(table.questionId),
  })
);

// Relations
export const testsRelations = relations(tests, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [tests.createdBy],
    references: [users.id],
  }),
  results: many(testResults),
  sections: many(testSections),
}));

export const testSectionsRelations = relations(testSections, ({ one, many }) => ({
  test: one(tests, {
    fields: [testSections.testId],
    references: [tests.id],
  }),
  questions: many(testSectionQuestions),
}));

export const testSectionQuestionsRelations = relations(testSectionQuestions, ({ one }) => ({
  section: one(testSections, {
    fields: [testSectionQuestions.testSectionId],
    references: [testSections.id],
  }),
  question: one(questions, {
    fields: [testSectionQuestions.questionId],
    references: [questions.id],
  }),
}));

export const testResultsRelations = relations(testResults, ({ one, many }) => ({
  test: one(tests, {
    fields: [testResults.testId],
    references: [tests.id],
  }),
  student: one(users, {
    fields: [testResults.studentId],
    references: [users.id],
  }),
  answers: many(testResultAnswers),
}));

export const testResultAnswersRelations = relations(testResultAnswers, ({ one }) => ({
  testResult: one(testResults, {
    fields: [testResultAnswers.testResultId],
    references: [testResults.id],
  }),
  question: one(questions, {
    fields: [testResultAnswers.questionId],
    references: [questions.id],
  }),
  section: one(testSections, {
    fields: [testResultAnswers.sectionId],
    references: [testSections.id],
  }),
}));

// Types
export type Test = typeof tests.$inferSelect;
export type NewTest = typeof tests.$inferInsert;
export type TestResult = typeof testResults.$inferSelect;
export type NewTestResult = typeof testResults.$inferInsert;
export type TestSection = typeof testSections.$inferSelect;
export type NewTestSection = typeof testSections.$inferInsert;
export type TestSectionQuestion = typeof testSectionQuestions.$inferSelect;
export type NewTestSectionQuestion = typeof testSectionQuestions.$inferInsert;
export type TestResultAnswer = typeof testResultAnswers.$inferSelect;
export type NewTestResultAnswer = typeof testResultAnswers.$inferInsert;
