import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Domains table
export const domains = pgTable('domains', {
  id: serial('id').primaryKey(),
  domainName: varchar('domain_name', { length: 255 }).notNull(),
  educationLevel: varchar('education_level', { length: 100 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Subjects table
export const subjects = pgTable(
  'subjects',
  {
    id: serial('id').primaryKey(),
    subjectName: varchar('subject_name', { length: 255 }).notNull(),
    domainId: integer('domain_id').notNull().references(() => domains.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    domainIdx: index('subjects_domain_idx').on(table.domainId),
  })
);

// Topics table
export const topics = pgTable(
  'topics',
  {
    id: serial('id').primaryKey(),
    topicName: varchar('topic_name', { length: 255 }).notNull().unique(),
    subjectId: integer('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    subjectIdx: index('topics_subject_idx').on(table.subjectId),
    topicNameIdx: index('topics_name_idx').on(table.topicName),
  })
);

// Relations
export const domainsRelations = relations(domains, ({ many }) => ({
  subjects: many(subjects),
}));

export const subjectsRelations = relations(subjects, ({ one, many }) => ({
  domain: one(domains, {
    fields: [subjects.domainId],
    references: [domains.id],
  }),
  topics: many(topics),
}));

export const topicsRelations = relations(topics, ({ one, many }) => ({
  subject: one(subjects, {
    fields: [topics.subjectId],
    references: [subjects.id],
  }),
  questions: many(questions),
}));

// Import questions for relations (will be defined in questions.ts)
import { questions } from './questions';

// Types
export type Domain = typeof domains.$inferSelect;
export type NewDomain = typeof domains.$inferInsert;
export type Subject = typeof subjects.$inferSelect;
export type NewSubject = typeof subjects.$inferInsert;
export type Topic = typeof topics.$inferSelect;
export type NewTopic = typeof topics.$inferInsert;
