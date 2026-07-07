// lib/readiness.ts — the ASE readiness score (PLAN §10).
//
//   readiness =
//       0.35 * (mean of best-2 practice-exam scores)
//     + 0.30 * (pset tests passed / pset tests total)
//     + 0.20 * (exam-level bank problems solved / exam-level bank total)
//     + 0.15 * (topics marked "confident" / 26)
//
// Pure and total: every component degrades to 0 when its denominator is 0, so
// an empty progress state yields a real 0 — never NaN. This is important because
// the M2 dashboard feeds it empty progress before any content exists.
//
// The score depends on both user PROGRESS (localStorage) and content TOTALS
// (how many pset tests / exam-level bank problems exist). Totals are passed in
// as `ReadinessTotals` so this module stays free of filesystem imports and can
// run on the client. The dashboard computes totals server-side from lib/content
// and hands them down; in M2 they are all 0, which is handled.

import type { ProgressState, TopicMeta } from '@/lib/types';

/** Content denominators the score needs, computed from lib/content server-side. */
export type ReadinessTotals = {
  /** Total number of pset test cases across all psets. */
  psetTestsTotal: number;
  /** Ids of exam-level bank problems (denominator + membership for "solved"). */
  examLevelBankIds: string[];
  /** All topic metas (for the confident-topics denominator + weakest list). */
  topics: TopicMeta[];
};

/** A per-component breakdown so the dashboard can explain the number. */
export type ReadinessComponent = {
  key: 'exams' | 'psets' | 'bank' | 'topics';
  label: string;
  /** 0..1 raw ratio for this component. */
  ratio: number;
  /** Weight applied to the ratio. */
  weight: number;
};

export type WeakTopic = {
  slug: string;
  title: string;
  /** Status as tracked in progress (default 'not-started'). */
  status: 'not-started' | 'reviewed' | 'confident';
};

export type Readiness = {
  /** 0..100 overall. */
  score: number;
  components: ReadinessComponent[];
  /** Up to 3 topics contributing least (not yet confident), for the dashboard. */
  weakestTopics: WeakTopic[];
  /** True when the last two exam attempts both passed ("ready to book"). */
  readyToBook: boolean;
};

const WEIGHTS = { exams: 0.35, psets: 0.3, bank: 0.2, topics: 0.15 } as const;

function ratio(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  const r = numerator / denominator;
  if (!Number.isFinite(r)) return 0;
  return Math.max(0, Math.min(1, r));
}

/** Mean of the best two exam attempt scores (0..1). 0 with <1 attempt handled. */
function bestTwoExamMean(state: ProgressState): number {
  const scores = state.examAttempts.map((a) => a.scorePct).sort((a, b) => b - a);
  if (scores.length === 0) return 0;
  const top = scores.slice(0, 2);
  const mean = top.reduce((s, v) => s + v, 0) / top.length;
  return ratio(mean, 100);
}

/** Fraction of all pset tests the user has passed (their best per problem). */
function psetPassRatio(state: ProgressState, psetTestsTotal: number): number {
  if (psetTestsTotal <= 0) return 0;
  let passed = 0;
  for (const p of Object.values(state.problems)) {
    passed += Math.min(p.lastPassed, p.lastTotal); // guard against stale totals
  }
  return ratio(passed, psetTestsTotal);
}

/** Fraction of exam-level bank problems solved. */
function bankSolvedRatio(state: ProgressState, examLevelBankIds: string[]): number {
  if (examLevelBankIds.length === 0) return 0;
  let solved = 0;
  for (const id of examLevelBankIds) {
    if (state.problems[id]?.solved) solved += 1;
  }
  return ratio(solved, examLevelBankIds.length);
}

/** Fraction of the 26 topics marked "confident". */
function confidentTopicsRatio(state: ProgressState, topics: TopicMeta[]): number {
  if (topics.length === 0) return 0;
  let confident = 0;
  for (const t of topics) {
    if (state.topicStatus[t.slug] === 'confident') confident += 1;
  }
  return ratio(confident, topics.length);
}

/** Whether the two most recent exam attempts both passed. */
function readyToBook(state: ProgressState): boolean {
  const attempts = state.examAttempts;
  if (attempts.length < 2) return false;
  const lastTwo = [...attempts]
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
    .slice(-2);
  return lastTwo.every((a) => a.passed);
}

/**
 * Compute the readiness score + supporting breakdown. Totally defined for empty
 * progress and empty totals (M2): returns score 0, all component ratios 0, and
 * the weakest-topics list seeded from the not-yet-confident topics.
 */
export function computeReadiness(state: ProgressState, totals: ReadinessTotals): Readiness {
  const examsRatio = bestTwoExamMean(state);
  const psetsRatio = psetPassRatio(state, totals.psetTestsTotal);
  const bankRatio = bankSolvedRatio(state, totals.examLevelBankIds);
  const topicsRatio = confidentTopicsRatio(state, totals.topics);

  const components: ReadinessComponent[] = [
    { key: 'exams', label: 'Best-2 practice exams', ratio: examsRatio, weight: WEIGHTS.exams },
    { key: 'psets', label: 'Pset tests passed', ratio: psetsRatio, weight: WEIGHTS.psets },
    { key: 'bank', label: 'Exam-level bank solved', ratio: bankRatio, weight: WEIGHTS.bank },
    { key: 'topics', label: 'Topics confident', ratio: topicsRatio, weight: WEIGHTS.topics },
  ];

  const score = clampPct(
    components.reduce((sum, c) => sum + c.ratio * c.weight, 0) * 100,
  );

  return {
    score,
    components,
    weakestTopics: pickWeakestTopics(state, totals.topics),
    readyToBook: readyToBook(state),
  };
}

/**
 * The 3 topics contributing least to readiness: not-started ranked worst, then
 * reviewed, then confident; ties broken by curriculum order. In M2 (all
 * not-started) this is just the first three topics.
 */
function pickWeakestTopics(state: ProgressState, topics: TopicMeta[]): WeakTopic[] {
  const rank = { 'not-started': 0, reviewed: 1, confident: 2 } as const;
  return topics
    .map((t) => ({
      slug: t.slug,
      title: t.title,
      status: state.topicStatus[t.slug] ?? 'not-started',
    }))
    .sort((a, b) => rank[a.status] - rank[b.status])
    .slice(0, 3);
}

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}
