// lib/grading.ts — grading helpers for short-answer problems and exams.
//
// Two jobs:
//  1. Short-answer grading (code-reading + complexity problems): normalize the
//     student's text and exact-match it against the canonical answer or any
//     accepted variant. Normalization is deliberately forgiving about the things
//     that don't matter (whitespace, case, trailing punctuation, common Big-O
//     spellings) and strict about the things that do.
//  2. Exam scoring: turn per-problem results into a weighted percentage and a
//     per-topic points breakdown, so the results page can show PASS / NOT YET
//     and which topics cost the most points.
//
// Pure functions only — no I/O, no React. Safe to import from client or server.

import type { PerProblemResult, UnitNumber } from '@/lib/types';

// ---------------------------------------------------------------------------
// Short-answer normalization + grading
// ---------------------------------------------------------------------------

/**
 * Canonicalize a short answer so trivially-different-but-equal answers match.
 *  - lowercased, trimmed, inner whitespace collapsed to single spaces
 *  - surrounding quotes and trailing sentence punctuation stripped
 *  - Big-O spellings folded: "big-o", "O(...)", "theta", "Θ", "θ" → a canonical
 *    "o(...)" form, and "log n"/"logn"/"log(n)" unified, so
 *    "O(n log n)" == "theta(n logn)".
 *
 * This is intentionally not a parser — it normalizes the surface forms real
 * students type. Authors still control the accepted set via `acceptedAnswers`.
 */
export function normalizeShortAnswer(raw: string): string {
  let s = (raw ?? '').toLowerCase().trim();

  // Unify theta / big-theta / big-o notation onto a single "o(" prefix.
  s = s.replace(/θ|Θ/g, 'theta');
  s = s.replace(/\bbig[\s-]*o(h)?\b/g, 'o');
  s = s.replace(/\bbig[\s-]*theta\b/g, 'theta');
  s = s.replace(/\btheta\b/g, 'o');

  // Collapse all whitespace runs to a single space.
  s = s.replace(/\s+/g, ' ');

  // Unify "log n", "logn", "log(n)" → "logn"; same for log2, lg.
  s = s.replace(/\blg\b/g, 'log');
  s = s.replace(/log\s*\(\s*([a-z0-9]+)\s*\)/g, 'log$1');
  s = s.replace(/log\s+([a-z0-9])/g, 'log$1');

  // Remove spaces immediately inside parentheses: "o( n )" → "o(n)".
  s = s.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');

  // Strip surrounding quotes and trailing sentence punctuation.
  s = s.replace(/^['"`]+|['"`]+$/g, '');
  s = s.replace(/[.。!?]+$/g, '');

  return s.trim();
}

export type ShortAnswerKey = {
  /** Canonical correct answer. */
  answer: string;
  /** Additional accepted variants (pre-normalization is fine). */
  acceptedAnswers?: string[];
};

/**
 * Grade a short answer: true iff its normalized form matches the normalized
 * canonical answer or any normalized accepted variant. Empty input never passes.
 */
export function gradeShortAnswer(studentAnswer: string, key: ShortAnswerKey): boolean {
  const got = normalizeShortAnswer(studentAnswer);
  if (got.length === 0) return false;
  const accepted = [key.answer, ...(key.acceptedAnswers ?? [])].map(normalizeShortAnswer);
  return accepted.includes(got);
}

// ---------------------------------------------------------------------------
// Coding-problem partial credit
// ---------------------------------------------------------------------------

/** Fraction (0..100) of tests passed. Returns 0 when there are no tests. */
export function codingScorePct(passed: number, total: number): number {
  if (total <= 0) return 0;
  return clampPct((passed / total) * 100);
}

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

// ---------------------------------------------------------------------------
// Exam scoring
// ---------------------------------------------------------------------------

/** One graded slot in an exam attempt, with the point weight it carried. */
export type ScoredSlot = PerProblemResult & {
  /** Point weight for this slot (from the exam blueprint). */
  points: number;
};

export type ExamScore = {
  /** Weighted percentage 0..100. */
  scorePct: number;
  passed: boolean;
  /** Points earned per unit and possible per unit. */
  byUnit: Record<UnitNumber, { earned: number; possible: number }>;
  /** Points lost per topic slug, biggest first (drives "weakest topics"). */
  pointsLostByTopic: { topicSlug: string; pointsLost: number }[];
};

/**
 * Compute a weighted exam score. Each slot contributes `points * scorePct/100`
 * of its `points` to the total. Pass iff scorePct >= passThreshold*100.
 * Tolerant of an empty slot list (returns 0, not NaN).
 */
export function scoreExam(slots: ScoredSlot[], passThreshold: number): ExamScore {
  const byUnit = emptyByUnit();
  const lostByTopic = new Map<string, number>();

  let earned = 0;
  let possible = 0;

  for (const slot of slots) {
    const pts = Math.max(0, slot.points);
    const got = (clampPct(slot.scorePct) / 100) * pts;
    earned += got;
    possible += pts;

    byUnit[slot.unit].earned += got;
    byUnit[slot.unit].possible += pts;

    const lost = pts - got;
    if (lost > 0) {
      lostByTopic.set(slot.topicSlug, (lostByTopic.get(slot.topicSlug) ?? 0) + lost);
    }
  }

  const scorePct = possible > 0 ? clampPct((earned / possible) * 100) : 0;
  const pointsLostByTopic = [...lostByTopic.entries()]
    .map(([topicSlug, pointsLost]) => ({ topicSlug, pointsLost }))
    .sort((a, b) => b.pointsLost - a.pointsLost);

  return {
    scorePct,
    passed: possible > 0 && scorePct >= passThreshold * 100,
    byUnit,
    pointsLostByTopic,
  };
}

function emptyByUnit(): Record<UnitNumber, { earned: number; possible: number }> {
  return {
    1: { earned: 0, possible: 0 },
    2: { earned: 0, possible: 0 },
    3: { earned: 0, possible: 0 },
    4: { earned: 0, possible: 0 },
  };
}
