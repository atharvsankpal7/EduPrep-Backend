import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { topics } from './topics';

// Enums
export const difficultyEnum = pgEnum('difficulty_level', ['easy', 'medium', 'hard']);

// Questions table
export const questions = pgTable(
  'questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    topicId: integer('topic_id').notNull().references(() => topics.id, { onDelete: 'cascade' }),
    questionText: text('question_text').notNull(),
    options: text('options').array().notNull(), // PostgreSQL array
    answer: integer('answer').notNull(), // Index of correct option
    difficultyLevel: difficultyEnum('difficulty_level'),
    explanation: text('explanation'),
    standard: integer('standard').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    topicIdx: index('questions_topic_idx').on(table.topicId),
    difficultyIdx: index('questions_difficulty_idx').on(table.difficultyLevel),
  })
);

// Relations
export const questionsRelations = relations(questions, ({ one }) => ({
  topic: one(topics, {
    fields: [questions.topicId],
    references: [topics.id],
  }),
}));

// Types
export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
