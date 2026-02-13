import {
  pgTable,
  serial,
  varchar,
  integer,
  jsonb,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { topics } from './topics';

// Topic distribution type for CET
export interface TopicDistributionData {
  topicId: number;
  topicName: string;
  questionCount: number;
  marksPerQuestion: number;
}

// Subject distribution type for CET
export interface SubjectDistributionData {
  subject: string;
  standard: number;
  topics: TopicDistributionData[];
}

// CET Distribution table
export const cetDistributions = pgTable('cet_distributions', {
  id: serial('id').primaryKey(),
  distributions: jsonb('distributions').$type<SubjectDistributionData[]>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Company-specific test details table
export const companySpecificTests = pgTable('company_specific_tests', {
  id: serial('id').primaryKey(),
  companyName: varchar('company_name', { length: 255 }).notNull().unique(),
  time: integer('time').notNull(), // in minutes
  numberOfQuestions: integer('number_of_questions').notNull(),
  topicIds: integer('topic_ids').array().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Types
export type CETDistribution = typeof cetDistributions.$inferSelect;
export type NewCETDistribution = typeof cetDistributions.$inferInsert;
export type CompanySpecificTest = typeof companySpecificTests.$inferSelect;
export type NewCompanySpecificTest = typeof companySpecificTests.$inferInsert;
