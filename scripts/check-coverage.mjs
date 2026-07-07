// scripts/check-coverage.mjs — bank coverage gate.
//
// Confirms every one of the 26 topics has at least MIN_PER_TOPIC bank problems,
// flags bank problems that reference an unknown topic slug, and reports the
// difficulty mix (>= half must be exam-level, per the spec). Exits non-zero if
// any topic is short or any slug is unknown.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BANK_DIR = path.join(ROOT, 'content', 'bank');
const MIN_PER_TOPIC = 3;

// The 26 canonical topic slugs come from ocw-index.json (built from the curriculum).
const ocw = JSON.parse(readFileSync(path.join(ROOT, 'content', 'ocw-index.json'), 'utf8'));
const SLUGS = ocw.lectures.map((l) => l.slug);
if (SLUGS.length !== 26) {
  console.error(`check-coverage: expected 26 topic slugs in ocw-index.json, found ${SLUGS.length}`);
  process.exit(1);
}
const SLUG_SET = new Set(SLUGS);

function loadBank() {
  if (!existsSync(BANK_DIR)) return [];
  const out = [];
  for (const name of readdirSync(BANK_DIR).sort()) {
    if (!name.endsWith('.json')) continue;
    const json = JSON.parse(readFileSync(path.join(BANK_DIR, name), 'utf8'));
    for (const p of Array.isArray(json) ? json : [json]) out.push(p);
  }
  return out;
}

const bank = loadBank();
const byTopic = new Map(SLUGS.map((s) => [s, []]));
const unknown = [];
for (const p of bank) {
  if (SLUG_SET.has(p.topicSlug)) byTopic.get(p.topicSlug).push(p);
  else unknown.push(p);
}

let short = 0;
console.log(`\ncheck-coverage: ${bank.length} bank problems across ${SLUGS.length} topics (min ${MIN_PER_TOPIC}/topic)\n`);
for (const slug of SLUGS) {
  const ps = byTopic.get(slug);
  const exam = ps.filter((p) => p.difficulty === 'exam-level').length;
  const kinds = ps.reduce((m, p) => ((m[p.kind] = (m[p.kind] || 0) + 1), m), {});
  const ok = ps.length >= MIN_PER_TOPIC;
  if (!ok) short++;
  const kindStr = Object.entries(kinds).map(([k, n]) => `${k}:${n}`).join(' ');
  console.log(`  ${ok ? '✓' : '✗'} ${slug.padEnd(38)} ${String(ps.length).padStart(2)} problems  (exam-level:${exam}  ${kindStr})`);
}

const total = bank.length;
const examLevel = bank.filter((p) => p.difficulty === 'exam-level').length;
console.log(`\n  exam-level: ${examLevel}/${total} (${total ? Math.round((100 * examLevel) / total) : 0}%)`);

let failed = false;
if (short > 0) {
  console.log(`\n✗ ${short} topic(s) have fewer than ${MIN_PER_TOPIC} bank problems.`);
  failed = true;
}
if (unknown.length > 0) {
  console.log(`\n✗ ${unknown.length} bank problem(s) reference an unknown topic slug:`);
  for (const p of unknown) console.log(`    ${p.id} -> "${p.topicSlug}"`);
  failed = true;
}
if (failed) process.exit(1);
console.log('\n✓ COVERAGE OK — every topic has enough bank problems and all slugs are valid.');
