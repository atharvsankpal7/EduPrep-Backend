import { pgTable, varchar, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const constants = pgTable('constants', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: jsonb('value').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Constant = typeof constants.$inferSelect;
export type NewConstant = typeof constants.$inferInsert;
