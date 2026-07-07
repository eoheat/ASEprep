// lib/types.ts — the single source of truth for every content shape in ase-prep.
//
// Per CLAUDE.md: everything under /content must satisfy these schemas, and we
// validate with zod at load time (build/server time). Types are inferred from
// the zod schemas so there is exactly one definition to keep in sync.
//
// Design note: coding tests are expressed in *Python*, not JSON. A test gives a
// Python expression that produces the "actual" value and a Python literal for
// the "expected" value; the runner compares them inside Pyodide so Python
// equality semantics (tuple vs list, int vs float, dict order) are correct. See
// PLAN.md "Pyodide execution design" for why.

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared enums / primitives
// ---------------------------------------------------------------------------

/** The four units of the 6.100L curriculum. */
export const UnitNumber = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);
export type UnitNumber = z.infer<typeof UnitNumber>;

/** Difficulty tag used across bank problems (and reused for pset problems). */
export const Difficulty = z.enum(['warmup', 'exam-level', 'stretch']);
export type Difficulty = z.infer<typeof Difficulty>;

/** Where a problem comes from. `finger` = OCW finger exercises (reconstructed as runnable). */
export const ProblemSource = z.enum(['pset', 'finger', 'bank', 'exam']);
export type ProblemSource = z.infer<typeof ProblemSource>;

/**
 * How the runner decides pass/fail for a coding test.
 *  - exact:     Python `actual == expected`. Note `1 == 1.0` is True in Python;
 *               set `strictType` to also require identical types.
 *  - float:     tolerance comparison, recursing STRUCTURALLY over lists, tuples,
 *               AND dicts (dict keys compared exactly, values recursively).
 *               Required by ps3 TF-IDF, which returns dict[str, float].
 *  - unordered: order-insensitive compare via `sorted(actual) == sorted(expected)`.
 *               RESTRICTION (author contract, not enforced by zod): elements must
 *               be mutually comparable & sortable (e.g. all ints, all strings).
 *               For unhashable/mixed elements (dicts, mixed int/str), `sorted()`
 *               raises TypeError — use `exact` against a pre-sorted expression.
 */
export const CompareMode = z.enum(['exact', 'float', 'unordered']);
export type CompareMode = z.infer<typeof CompareMode>;

// ---------------------------------------------------------------------------
// Coding tests
// ---------------------------------------------------------------------------

export const TestCase = z.object({
  /** Human label shown in the pass/fail list. */
  name: z.string().optional(),
  /** Python expression evaluated against the user's code, yielding the actual value. */
  expression: z.string(),
  /** Python literal (source text) for the expected value, e.g. "[1, 2, 3]" or "10". */
  expected: z.string(),
  /** Comparison strategy; defaults to exact equality. */
  compare: CompareMode.default('exact'),
  /** Only meaningful when compare === 'float'. */
  tolerance: z.number().optional(),
  /**
   * With compare === 'exact', also require `type(actual) === type(expected)`, so
   * `1` does not match `1.0`. Cheap insurance for integer-division / int()
   * problems where the return type is part of correctness.
   */
  strictType: z.boolean().default(false),
  /** Text fed to input() when the code reads stdin (newline-separated). */
  stdin: z.string().optional(),
  /** Hidden tests still grade, but expected/expression are not shown pre-submit. */
  hidden: z.boolean().default(false),
});
export type TestCase = z.infer<typeof TestCase>;

// ---------------------------------------------------------------------------
// Problems (coding, code-reading, complexity) — discriminated on `kind`
// ---------------------------------------------------------------------------

const problemBase = {
  /** Globally unique, stable id, e.g. "ps1-p2", "bank-15-a", "exam3-r1". */
  id: z.string(),
  title: z.string(),
  /** Slug of the topic this problem belongs to (all 26 topics covered in the bank). */
  topicSlug: z.string(),
  unit: UnitNumber,
  /** Problem statement in markdown. */
  statement: z.string(),
  difficulty: Difficulty.optional(),
  source: ProblemSource,
  /** True when authored as a faithful reconstruction (not verbatim OCW). */
  reconstructed: z.boolean().default(false),
};

/**
 * A file materialized into the Pyodide virtual filesystem before the user's
 * code runs. Covers pset data files (ps3 *.txt, ps4 words/story/pads) AND
 * auxiliary modules a problem imports (e.g. ps4c does `import ps4b`, modeled as
 * a DataFile named "ps4b.py"). Provide exactly one of `text` or `url`.
 */
export const DataFile = z.object({
  /** Filename as seen by the Python code, e.g. "story.txt" or "ps4b.py". */
  name: z.string(),
  /** Inline UTF-8 contents (for small text/module files). */
  text: z.string().optional(),
  /** URL under /public to fetch and write as bytes (for binary assets). */
  url: z.string().optional(),
});
export type DataFile = z.infer<typeof DataFile>;

/** A problem the student solves by writing Python, graded by running tests. */
export const CodingProblem = z.object({
  ...problemBase,
  kind: z.literal('coding'),
  /** e.g. "def sum_digits(n):" — the primary signature the tests call. */
  functionSignature: z.string(),
  /** Editor contents on first load / after Reset. */
  starterCode: z.string(),
  /** Graded tests. Empty only for study-only problems (see studyOnly). */
  tests: z.array(TestCase).default([]),
  /** Reference solution; revealed behind a confirm step, and used by validate-tests. */
  solution: z.string(),
  /** Pyodide packages to load before running, e.g. ["numpy"], ["Pillow"]. */
  pyPackages: z.array(z.string()).default([]),
  /** Files/modules written into the Pyodide FS before running (see DataFile). */
  dataFiles: z.array(DataFile).default([]),
  /**
   * Study-only: has a reference solution to read but is NOT auto-graded — e.g.
   * ps2's interactive game, ps5's image recovery, ps4 decode_story. These carry
   * no tests; validate-tests skips them and the workspace shows a study note.
   */
  studyOnly: z.boolean().default(false),
});
export type CodingProblem = z.infer<typeof CodingProblem>;

// Code-reading and complexity problems share the same short-answer shape; they
// differ only in `kind` so they can be tagged and rendered/graded appropriately.
const shortAnswerShape = {
  ...problemBase,
  /** The code snippet or question body the student reasons about (markdown/code). */
  prompt: z.string(),
  /** Canonical correct answer (its normalized form is the grading key). */
  answer: z.string(),
  /** Extra accepted answers after normalization (whitespace/case/synonyms). */
  acceptedAnswers: z.array(z.string()).default([]),
  /** Optional worked explanation, shown after grading. */
  explanation: z.string().optional(),
};

/** "What does this print / return?" — exact/normalized short-answer match. */
export const CodeReadingProblem = z.object({ ...shortAnswerShape, kind: z.literal('code-reading') });
export type CodeReadingProblem = z.infer<typeof CodeReadingProblem>;

/** "Give the Big-O of this function." — normalized short-answer match. */
export const ComplexityProblem = z.object({ ...shortAnswerShape, kind: z.literal('complexity') });
export type ComplexityProblem = z.infer<typeof ComplexityProblem>;

export const Problem = z.discriminatedUnion('kind', [
  CodingProblem,
  CodeReadingProblem,
  ComplexityProblem,
]);
export type Problem = z.infer<typeof Problem>;

// ---------------------------------------------------------------------------
// Problem sets
// ---------------------------------------------------------------------------

export const Pset = z.object({
  /** "ps0" .. "ps5". */
  id: z.string(),
  number: z.number().int(),
  title: z.string(),
  /** Link back to the OCW pset page for attribution. */
  ocwUrl: z.string().url().optional(),
  /** Markdown overview shown at the top of the pset. */
  overview: z.string(),
  problems: z.array(Problem),
  reconstructed: z.boolean().default(false),
});
export type Pset = z.infer<typeof Pset>;

// ---------------------------------------------------------------------------
// Topics (summary pages) and units
// ---------------------------------------------------------------------------

export const OcwRef = z.object({
  /** OCW lecture number this topic maps to (1..26). */
  lecture: z.number().int(),
  notesUrl: z.string().url().optional(),
  videoUrl: z.string().url().optional(),
});
export type OcwRef = z.infer<typeof OcwRef>;

/**
 * Frontmatter for a topic summary MDX file. The six-section body (intuition,
 * mechanics, worked example, traps, memorize-vs-understand, ASE check) lives in
 * the MDX itself; this is the typed metadata that drives nav and the dashboard.
 */
export const TopicMeta = z.object({
  /** kebab-case slug matching the OCW lecture, e.g. "04-loops-strings-binary". */
  slug: z.string(),
  /** 1..26. */
  number: z.number().int(),
  unit: UnitNumber,
  title: z.string(),
  /** One-line description for the sidebar and dashboard. */
  blurb: z.string(),
  ocw: OcwRef,
});
export type TopicMeta = z.infer<typeof TopicMeta>;

export const Unit = z.object({
  number: UnitNumber,
  title: z.string(),
  /** Topic slugs in display order. */
  topicSlugs: z.array(z.string()),
});
export type Unit = z.infer<typeof Unit>;

// ---------------------------------------------------------------------------
// Practice exams
// ---------------------------------------------------------------------------

export const ExamVariant = z.object({
  /** e.g. "exam1-A". */
  id: z.string(),
  label: z.string(),
  /** Ordered problem ids drawn from the bank/exam pools. */
  problemIds: z.array(z.string()).min(1),
});
export type ExamVariant = z.infer<typeof ExamVariant>;

export const Exam = z.object({
  /** "exam1" .. "exam6". */
  id: z.string(),
  title: z.string(),
  /** Countdown length; configurable. Default 120 = confirmed real ASE length. */
  timeLimitMinutes: z.number().int().default(120),
  /** Passing fraction; configurable, default 0.70 (MIT does not publish the cutoff). */
  passThreshold: z.number().min(0).max(1).default(0.7),
  /** Human-readable blueprint: how the exam samples the four units. */
  blueprint: z.string(),
  /** At least two variants so retaking is not memorization. */
  variants: z.array(ExamVariant).min(2),
});
export type Exam = z.infer<typeof Exam>;

// ---------------------------------------------------------------------------
// Runner I/O (shared between /lib/runner.ts and the workspace UI)
// ---------------------------------------------------------------------------

export const RunResult = z.object({
  stdout: z.string(),
  stderr: z.string(),
  /** Uncaught exception text, or null on clean completion. */
  error: z.string().nullable(),
  /** True when the worker was terminated by the 10s watchdog. */
  timedOut: z.boolean(),
  durationMs: z.number(),
});
export type RunResult = z.infer<typeof RunResult>;

export const TestOutcome = z.object({
  name: z.string(),
  pass: z.boolean(),
  /** Python repr() of the expected value, for the failure display. */
  expectedRepr: z.string(),
  /** Python repr() of the actual value, for the failure display. */
  actualRepr: z.string(),
  /** Error text if the test raised before comparison, else null. */
  error: z.string().nullable(),
  hidden: z.boolean(),
});
export type TestOutcome = z.infer<typeof TestOutcome>;

// ---------------------------------------------------------------------------
// Progress state (localStorage, single versioned key)
// ---------------------------------------------------------------------------

/** localStorage key for all persisted state. Bump the version to invalidate. */
export const PROGRESS_KEY = 'ase-prep:v1';

/**
 * Default passing threshold used by exams and the readiness signal.
 * MIT does not publish the real ASE cutoff. Spec asked for 0.70; reconnaissance
 * recommended 0.60. Kept at 0.70 per spec, but this is a single knob to change.
 * See content/exam-format-notes.md.
 */
export const DEFAULT_PASS_THRESHOLD = 0.7;

/** Default exam length in minutes. 120 = confirmed real ASE length (was assumed 180). */
export const DEFAULT_EXAM_MINUTES = 120;

export const TopicStatus = z.enum(['not-started', 'reviewed', 'confident']);
export type TopicStatus = z.infer<typeof TopicStatus>;

export const ProblemProgress = z.object({
  /** Last editor contents (per-problem draft). */
  draftCode: z.string().optional(),
  /** True once every (visible+hidden) test passed at least once. */
  solved: z.boolean().default(false),
  lastPassed: z.number().int().default(0),
  lastTotal: z.number().int().default(0),
  /** ISO timestamp of last update. */
  updatedAt: z.string(),
});
export type ProblemProgress = z.infer<typeof ProblemProgress>;

export const PerProblemResult = z.object({
  problemId: z.string(),
  topicSlug: z.string(),
  unit: UnitNumber,
  /** 0..100 — fraction of tests passed (partial credit). */
  scorePct: z.number(),
});
export type PerProblemResult = z.infer<typeof PerProblemResult>;

export const ExamAttempt = z.object({
  id: z.string(),
  examId: z.string(),
  variantId: z.string(),
  startedAt: z.string(),
  submittedAt: z.string(),
  /** 0..100 overall. */
  scorePct: z.number(),
  passed: z.boolean(),
  perProblem: z.array(PerProblemResult),
});
export type ExamAttempt = z.infer<typeof ExamAttempt>;

export const ProgressState = z.object({
  version: z.literal(1),
  /** topicSlug -> status. */
  topicStatus: z.record(z.string(), TopicStatus),
  /** problemId -> progress. */
  problems: z.record(z.string(), ProblemProgress),
  examAttempts: z.array(ExamAttempt),
  updatedAt: z.string(),
});
export type ProgressState = z.infer<typeof ProgressState>;

/** A fresh, empty progress state (used on first load and on Reset-all). */
export function emptyProgress(nowIso: string): ProgressState {
  return {
    version: 1,
    topicStatus: {},
    problems: {},
    examAttempts: [],
    updatedAt: nowIso,
  };
}
