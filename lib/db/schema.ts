// lib/db/schema.ts — Drizzle schema (M7). Maps the existing ProgressState type
// (lib/types.ts) nearly 1:1. Deliberately NOT normalized further, and no derived
// values are stored — the readiness score stays computed from these rows.
//
// Content (topics/psets/finger/bank/exams) never enters the DB; it stays static,
// versioned with the code. This DB holds only per-user progress + durability.

import { pgTable, text, integer, boolean, numeric, jsonb, timestamp, primaryKey, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email'),
  // Stable provider account id (Google's `sub`). Provider-neutral name so more
  // providers can be added later without a rename.
  accountId: text('account_id').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const topicStatus = pgTable(
  'topic_status',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    // 'not-started' | 'reviewed' | 'confident' (TopicStatus in lib/types.ts)
    status: text('status').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.slug] }) }),
);

export const problemProgress = pgTable(
  'problem_progress',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    problemId: text('problem_id').notNull(),
    draftCode: text('draft_code'),
    solved: boolean('solved').notNull().default(false),
    lastPassed: integer('last_passed').notNull().default(0),
    lastTotal: integer('last_total').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.problemId] }) }),
);

// Append-only. The id is the client-generated attempt id
// (`${examId}:${variantId}:${startedAt}`) so a retry upserts idempotently and an
// attempt is never lost nor duplicated. Never UPDATE or DELETE from app code.
export const examAttempts = pgTable('exam_attempts', {
  id: text('id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  examId: text('exam_id').notNull(),
  variantId: text('variant_id').notNull(),
  score: numeric('score').notNull(),
  passed: boolean('passed').notNull(),
  // PerProblemResult[] from lib/types.ts — only ever rendered, never queried into.
  perProblem: jsonb('per_problem').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull(),
});

export const settings = pgTable('settings', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  passThreshold: numeric('pass_threshold').notNull().default('0.7'),
  timerMinutes: integer('timer_minutes').notNull().default(120),
});

export type UserRow = typeof users.$inferSelect;
export type TopicStatusRow = typeof topicStatus.$inferSelect;
export type ProblemProgressRow = typeof problemProgress.$inferSelect;
export type ExamAttemptRow = typeof examAttempts.$inferSelect;
export type SettingsRow = typeof settings.$inferSelect;
