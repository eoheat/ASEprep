'use server';

// lib/actions/progress.ts — server actions for progress sync (M7).
//
// Thin wrappers over lib/db/progress-repo that resolve the user from the Auth.js
// session. Callable from the client (progress.ts) as RPCs; the DB/auth code never
// ships to the browser. All are no-ops when not signed in (middleware makes that
// unreachable in normal use, but the guard keeps them safe).

import { auth } from '@/lib/auth';
import * as repo from '@/lib/db/progress-repo';
import { ProgressState, emptyProgress, type TopicStatus } from '@/lib/types';

async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** The signed-in user's full server-side progress (empty when not signed in). */
export async function pullProgress(): Promise<ProgressState> {
  const uid = await currentUserId();
  if (!uid) return emptyProgress(new Date().toISOString());
  return repo.getProgressForUser(uid);
}

export async function pushTopicStatus(slug: string, status: TopicStatus): Promise<void> {
  const uid = await currentUserId();
  if (uid) await repo.setTopicStatus(uid, slug, status);
}

export async function pushProblemResult(id: string, passed: number, total: number): Promise<void> {
  const uid = await currentUserId();
  if (uid) await repo.recordProblemResult(uid, id, passed, total);
}

export async function pushDraft(id: string, code: string): Promise<void> {
  const uid = await currentUserId();
  if (uid) await repo.saveDraft(uid, id, code);
}

/**
 * Import a localStorage backup into the DB (the localStorage → DB migration path).
 * Validates the blob server-side and returns the counts written, or null if not
 * signed in / the blob is invalid.
 */
export async function importProgress(
  raw: unknown,
): Promise<{ topics: number; problems: number; attempts: number } | null> {
  const uid = await currentUserId();
  if (!uid) return null;
  const parsed = ProgressState.safeParse(raw);
  if (!parsed.success) return null;
  return repo.importState(uid, parsed.data);
}
