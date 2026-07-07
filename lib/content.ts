// lib/content.ts — zod-validated content loaders (topics, psets, finger, bank, exams).
//
// These are the ONLY functions the app uses to read /content. Everything is
// validated against the schemas in lib/types.ts at load time (CLAUDE.md). During
// M2 the content JSON/MDX does not exist yet — M4 drops it in — so every loader
// is tolerant of missing files: it returns empty/placeholder data and NEVER
// throws at request time. Malformed content (present but invalid) is a real bug,
// so we surface it in dev via a console warning but still degrade gracefully.
//
// Server-only module: it touches the filesystem. Do not import from a client
// component. Topic MDX bodies are read here and rendered with next-mdx-remote in
// the (server) topic page. (Importing node:fs already makes this fail loudly if
// ever pulled into a client bundle, so it is effectively server-only.)

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { z } from 'zod';

import {
  Exam,
  Problem,
  Pset,
  TopicMeta,
  type CodingProblem,
} from '@/lib/types';
import { TOPICS, getTopic } from '@/lib/curriculum';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const CONTENT_DIR = path.join(process.cwd(), 'content');
const TOPICS_DIR = path.join(CONTENT_DIR, 'topics');
const PSETS_DIR = path.join(CONTENT_DIR, 'psets');
const FINGER_DIR = path.join(CONTENT_DIR, 'finger');
const BANK_DIR = path.join(CONTENT_DIR, 'bank');
const EXAMS_DIR = path.join(CONTENT_DIR, 'exams');

/** The six psets, in order. Ids are stable and used across routes. */
export const PSET_IDS = ['ps0', 'ps1', 'ps2', 'ps3', 'ps4', 'ps5'] as const;

// ---------------------------------------------------------------------------
// Low-level fs helpers (all missing-tolerant)
// ---------------------------------------------------------------------------

function readFileOrNull(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function readJsonFiles(dir: string): unknown[] {
  let names: string[];
  try {
    names = fs.readdirSync(dir);
  } catch {
    return []; // directory not created yet (M2) — no content, not an error.
  }
  const out: unknown[] = [];
  for (const name of names.sort()) {
    if (!name.endsWith('.json')) continue;
    const raw = readFileOrNull(path.join(dir, name));
    if (raw == null) continue;
    try {
      out.push(JSON.parse(raw));
    } catch (err) {
      warnBadContent(path.join(dir, name), err);
    }
  }
  return out;
}

/** Present-but-invalid content is a bug; log it in dev, skip it at runtime. */
function warnBadContent(where: string, err: unknown): void {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn(`[content] ignoring invalid content at ${where}:`, err);
  }
}

/**
 * Parse with a schema; on failure warn and return null (never throw). Generic
 * over the schema (not the type) so the result is the schema's OUTPUT type —
 * i.e. defaults applied, fields required — matching the exported content types.
 */
function safeParse<S extends z.ZodTypeAny>(schema: S, value: unknown, where: string): z.output<S> | null {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  warnBadContent(where, result.error);
  return null;
}

// ---------------------------------------------------------------------------
// Topics
// ---------------------------------------------------------------------------

export type TopicContent = {
  meta: TopicMeta;
  /** Raw MDX body (frontmatter stripped). Empty string when no file exists yet. */
  body: string;
  /** True when a real MDX file backed this topic (M4+); false = placeholder. */
  hasBody: boolean;
};

/**
 * Topic metadata comes from the curriculum registry (always present). The MDX
 * body is loaded from content/topics/<slug>.mdx when it exists; M4 authors it.
 * Frontmatter in the MDX, if present, is merged over the registry defaults.
 */
export function getTopicMeta(slug: string): TopicContent | null {
  const base = getTopic(slug);
  if (!base) return null;

  const raw = readFileOrNull(path.join(TOPICS_DIR, `${slug}.mdx`));
  if (raw == null) {
    return { meta: base, body: '', hasBody: false };
  }

  const { content, data } = matter(raw);
  // Merge MDX frontmatter over registry defaults, then re-validate.
  const merged = safeParse(TopicMeta, { ...base, ...data }, `topics/${slug}.mdx`);
  return { meta: merged ?? base, body: content, hasBody: content.trim().length > 0 };
}

export function listTopics(): TopicMeta[] {
  return TOPICS;
}

// ---------------------------------------------------------------------------
// Psets
// ---------------------------------------------------------------------------

/**
 * Load one pset from content/psets/<id>.json. Returns null when the file does
 * not exist yet (M2) — index/detail pages render a placeholder in that case.
 */
export function getPset(psetId: string): Pset | null {
  const raw = readFileOrNull(path.join(PSETS_DIR, `${psetId}.json`));
  if (raw == null) return null;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    warnBadContent(`psets/${psetId}.json`, err);
    return null;
  }
  return safeParse(Pset, json, `psets/${psetId}.json`);
}

/** All psets that currently have content, in ps0..ps5 order. Empty in M2. */
export function listPsets(): Pset[] {
  const out: Pset[] = [];
  for (const id of PSET_IDS) {
    const p = getPset(id);
    if (p) out.push(p);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Finger exercises
// ---------------------------------------------------------------------------

/**
 * Finger exercises are stored as Problem JSON under content/finger/. Each file
 * may hold a single Problem or an array of Problems (M4's choice). Returns []
 * until M4 authors them.
 */
export function listFinger(): Problem[] {
  return collectProblems(FINGER_DIR, 'finger');
}

// ---------------------------------------------------------------------------
// Bank
// ---------------------------------------------------------------------------

/** All bank problems across all 26 topic files. Empty until M4. */
export function listBank(): Problem[] {
  return collectProblems(BANK_DIR, 'bank');
}

/**
 * Collect Problems from every JSON file in a directory. Files may be a single
 * Problem object or an array of Problems. Invalid entries are skipped (warned).
 */
function collectProblems(dir: string, label: string): Problem[] {
  const out: Problem[] = [];
  for (const json of readJsonFiles(dir)) {
    const entries = Array.isArray(json) ? json : [json];
    for (const entry of entries) {
      const parsed = safeParse(Problem, entry, `${label} problem`);
      if (parsed) out.push(parsed);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Exams
// ---------------------------------------------------------------------------

/** All exams that currently have content, sorted by id. Empty until M5. */
export function listExams(): Exam[] {
  const out: Exam[] = [];
  for (const json of readJsonFiles(EXAMS_DIR)) {
    const parsed = safeParse(Exam, json, 'exam');
    if (parsed) out.push(parsed);
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

export function getExam(examId: string): Exam | null {
  const raw = readFileOrNull(path.join(EXAMS_DIR, `${examId}.json`));
  if (raw != null) {
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch (err) {
      warnBadContent(`exams/${examId}.json`, err);
      return null;
    }
    return safeParse(Exam, json, `exams/${examId}.json`);
  }
  // Fall back to scanning (in case a file bundles multiple exams / different name).
  return listExams().find((e) => e.id === examId) ?? null;
}

// ---------------------------------------------------------------------------
// Cross-source problem lookup
// ---------------------------------------------------------------------------

/**
 * Resolve a globally-unique problem id across psets, finger, and bank. Problem
 * ids are unique by design (PLAN §6), so a single getProblem(id) serves every
 * workspace route. Returns null when not found (M2 placeholder, or bad id).
 */
export function getProblem(id: string): Problem | null {
  for (const pset of listPsets()) {
    const hit = pset.problems.find((p) => p.id === id);
    if (hit) return hit;
  }
  for (const p of listFinger()) {
    if (p.id === id) return p;
  }
  for (const p of listBank()) {
    if (p.id === id) return p;
  }
  return null;
}

/** Narrowing helper for workspace pages that require a coding problem. */
export function isCodingProblem(p: Problem): p is CodingProblem {
  return p.kind === 'coding';
}

/** All coding problems referenced by an exam variant, in order (skips missing). */
export function getExamProblems(problemIds: string[]): Problem[] {
  const out: Problem[] = [];
  for (const id of problemIds) {
    const p = getProblem(id);
    if (p) out.push(p);
  }
  return out;
}
