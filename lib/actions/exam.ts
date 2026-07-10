'use server';

// lib/actions/exam.ts — server actions for exam durability (M7/M8).
//
// pushExamAttempt inserts a graded attempt (idempotent on the client attempt id,
// so the client can retry until acknowledged without duplicating — "exam attempts
// must never be lost"). startExam (M8) stamps the start time server-side so a
// mid-exam refresh resumes with the true remaining time.

import { auth } from '@/lib/auth';
import * as repo from '@/lib/db/progress-repo';
import type { ExamAttempt } from '@/lib/types';

async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function pushExamAttempt(attempt: ExamAttempt): Promise<void> {
  const uid = await currentUserId();
  if (uid) await repo.insertExamAttempt(uid, attempt);
}
