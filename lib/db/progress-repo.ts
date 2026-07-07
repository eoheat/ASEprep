// lib/db/progress-repo.ts — pure DB access for user progress (M7).
//
// Every function takes an explicit userId (never reads the session) so it is
// unit-testable without auth. The server actions in lib/actions/* are thin
// wrappers that resolve userId from the session and delegate here.
//
// Shapes mirror lib/types.ts ProgressState so the client store hydrates 1:1.

import { eq, sql } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import {
  emptyProgress,
  type ProgressState,
  type ExamAttempt,
  type TopicStatus,
  type PerProblemResult,
} from '@/lib/types';

const { users, topicStatus, problemProgress, examAttempts } = schema;

/** Upsert the user row by GitHub id; return the internal uuid used as the FK. */
export async function upsertUser(githubId: string, email: string | null): Promise<string> {
  const db = getDb();
  const rows = await db
    .insert(users)
    .values({ githubId, email })
    .onConflictDoUpdate({ target: users.githubId, set: { email } })
    .returning({ id: users.id });
  return rows[0].id;
}

/** The user's full progress, shaped as the client ProgressState. */
export async function getProgressForUser(userId: string): Promise<ProgressState> {
  const db = getDb();
  const [ts, pp, ea] = await Promise.all([
    db.select().from(topicStatus).where(eq(topicStatus.userId, userId)),
    db.select().from(problemProgress).where(eq(problemProgress.userId, userId)),
    db.select().from(examAttempts).where(eq(examAttempts.userId, userId)),
  ]);

  const state = emptyProgress(new Date().toISOString());
  for (const r of ts) state.topicStatus[r.slug] = r.status as TopicStatus;
  for (const r of pp) {
    state.problems[r.problemId] = {
      draftCode: r.draftCode ?? undefined,
      solved: r.solved,
      lastPassed: r.lastPassed,
      lastTotal: r.lastTotal,
      updatedAt: r.updatedAt.toISOString(),
    };
  }
  state.examAttempts = ea
    .map((r) => ({
      id: r.id,
      examId: r.examId,
      variantId: r.variantId,
      startedAt: r.startedAt.toISOString(),
      submittedAt: r.submittedAt.toISOString(),
      scorePct: Number(r.score),
      passed: r.passed,
      perProblem: r.perProblem as PerProblemResult[],
    }))
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
  return state;
}

export async function setTopicStatus(userId: string, slug: string, status: TopicStatus): Promise<void> {
  const db = getDb();
  await db
    .insert(topicStatus)
    .values({ userId, slug, status })
    .onConflictDoUpdate({
      target: [topicStatus.userId, topicStatus.slug],
      set: { status, updatedAt: new Date() },
    });
}

/** Save an editor draft without disturbing solved/pass counts. */
export async function saveDraft(userId: string, problemId: string, draftCode: string): Promise<void> {
  const db = getDb();
  await db
    .insert(problemProgress)
    .values({ userId, problemId, draftCode })
    .onConflictDoUpdate({
      target: [problemProgress.userId, problemProgress.problemId],
      set: { draftCode, updatedAt: new Date() },
    });
}

/** Record a test run. `solved` is sticky (once true, stays true) without touching the draft. */
export async function recordProblemResult(
  userId: string,
  problemId: string,
  passed: number,
  total: number,
): Promise<void> {
  const db = getDb();
  const solved = total > 0 && passed >= total;
  await db
    .insert(problemProgress)
    .values({ userId, problemId, solved, lastPassed: passed, lastTotal: total })
    .onConflictDoUpdate({
      target: [problemProgress.userId, problemProgress.problemId],
      set: {
        solved: sql`${problemProgress.solved} or ${solved}`,
        lastPassed: passed,
        lastTotal: total,
        updatedAt: new Date(),
      },
    });
}

/** Append-only insert; idempotent on the client-generated attempt id (retry-safe). */
export async function insertExamAttempt(userId: string, a: ExamAttempt): Promise<void> {
  const db = getDb();
  await db
    .insert(examAttempts)
    .values({
      id: a.id,
      userId,
      examId: a.examId,
      variantId: a.variantId,
      score: String(a.scorePct),
      passed: a.passed,
      perProblem: a.perProblem,
      startedAt: new Date(a.startedAt),
      submittedAt: new Date(a.submittedAt),
    })
    .onConflictDoNothing({ target: examAttempts.id });
}

/**
 * Import a whole ProgressState (the localStorage → DB migration). Upserts topic
 * statuses + problem progress and inserts-if-absent every exam attempt, then
 * returns the counts written. Never deletes.
 */
export async function importState(
  userId: string,
  state: ProgressState,
): Promise<{ topics: number; problems: number; attempts: number }> {
  const topics = Object.entries(state.topicStatus);
  const problems = Object.entries(state.problems);

  for (const [slug, status] of topics) await setTopicStatus(userId, slug, status);
  for (const [id, p] of problems) {
    if (p.draftCode !== undefined) await saveDraft(userId, id, p.draftCode);
    await recordProblemResult(userId, id, p.lastPassed, p.lastTotal);
  }
  for (const a of state.examAttempts) await insertExamAttempt(userId, a);

  return { topics: topics.length, problems: problems.length, attempts: state.examAttempts.length };
}
