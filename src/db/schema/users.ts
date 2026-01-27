import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tests, testResults } from './tests';

// Enums
export const userRoleEnum = pgEnum('user_role', ['student', 'admin']);

// Users table
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    password: text('password').notNull(),
    refreshToken: text('refresh_token'),
    role: userRoleEnum('role').default('student').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: index('users_email_idx').on(table.email),
  })
);

// User relations
export const usersRelations = relations(users, ({ many }) => ({
  tests: many(tests),
  testResults: many(testResults),
}));

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
