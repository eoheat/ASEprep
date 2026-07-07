// scripts/validate-tests.mjs — the content quality gate.
//
// Runs every coding problem's REFERENCE SOLUTION against its own tests using the
// SAME HARNESS_PY as the in-browser runner (lib/py/harness.mjs), in Node-hosted
// Pyodide. A correct reference solution MUST pass all of its tests; any failure
// or error is a content bug (per CLAUDE.md, "a test a correct solution fails is
// YOUR bug"). Exits non-zero if anything fails, so it can gate shipping.
//
// Usage: node scripts/validate-tests.mjs [--group psets|finger|bank] [--id <problemId>]

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPyodide } from 'pyodide';
import { HARNESS_PY } from '../lib/py/harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'content');
const PUBLIC = path.join(ROOT, 'public');

const args = process.argv.slice(2);
function flag(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}
function flagAll(name) {
  const out = [];
  for (let i = 0; i < args.length; i++) if (args[i] === name && args[i + 1]) out.push(args[i + 1]);
  return out;
}
// --file <path> (repeatable) validates ONLY those content files — so parallel
// authors can gate their own work without tripping over each other's in-progress
// writes. --group / --id further narrow the default full scan.
const only = { group: flag('--group'), id: flag('--id'), files: flagAll('--file') };

function listJson(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((n) => n.endsWith('.json')).sort().map((n) => path.join(dir, n));
}

/** Extract problems from one parsed file: a Pset (has `problems`), an array, or a single Problem. */
function problemsFromJson(json, group, file) {
  const out = [];
  if (json && Array.isArray(json.problems)) for (const p of json.problems) out.push({ p, group, file });
  else if (Array.isArray(json)) for (const p of json) out.push({ p, group, file });
  else if (json) out.push({ p: json, group, file });
  return out;
}

function groupOf(f) {
  return f.includes(`${path.sep}psets${path.sep}`) ? 'psets'
    : f.includes(`${path.sep}finger${path.sep}`) ? 'finger'
      : f.includes(`${path.sep}bank${path.sep}`) ? 'bank' : 'file';
}

/** Gather every coding problem across psets, finger, and bank (or just --file targets). */
function loadCodingProblems() {
  const out = [];
  const files = only.files.length
    ? only.files.map((rel) => (path.isAbsolute(rel) ? rel : path.join(ROOT, rel)))
    : [...listJson(path.join(CONTENT, 'psets')), ...listJson(path.join(CONTENT, 'finger')), ...listJson(path.join(CONTENT, 'bank'))];
  for (const f of files) {
    out.push(...problemsFromJson(JSON.parse(readFileSync(f, 'utf8')), groupOf(f), path.relative(ROOT, f)));
  }
  return out
    .filter(({ p }) => p.kind === 'coding')
    .filter(({ p, group }) => (!only.group || group === only.group) && (!only.id || p.id === only.id));
}

/** Mirror lib/pyodide-worker.ts prepare(): load packages + write data files. */
async function prepare(py, p) {
  if (p.pyPackages?.length) await py.loadPackage(p.pyPackages);
  for (const df of p.dataFiles ?? []) {
    if (df.text !== undefined) py.FS.writeFile(df.name, df.text, { encoding: 'utf8' });
    else if (df.url) py.FS.writeFile(df.name, new Uint8Array(readFileSync(path.join(PUBLIC, df.url.replace(/^\//, '')))));
    else throw new Error(`dataFile "${df.name}" has neither text nor url`);
  }
}

async function main() {
  const problems = loadCodingProblems();
  if (problems.length === 0) {
    console.log('validate-tests: no coding problems found (nothing to validate yet).');
    return;
  }

  const py = await loadPyodide();
  py.runPython(HARNESS_PY);

  let totalTests = 0;
  let skipped = 0;
  const failures = [];

  for (const { p, group, file } of problems) {
    if (!p.solution) {
      failures.push({ id: p.id, group, file, bad: [{ name: '(no reference solution)', error: 'missing solution' }] });
      continue;
    }
    if (p.studyOnly || (p.tests ?? []).length === 0) {
      skipped++; // study-only: has a reference solution but no auto-grading.
      continue;
    }
    try {
      await prepare(py, p);
    } catch (e) {
      failures.push({ id: p.id, group, file, bad: [{ name: '(prepare failed)', error: String(e) }] });
      continue;
    }
    const tests = p.tests ?? [];
    let outcomes;
    try {
      py.globals.set('__ase_user_code', p.solution);
      py.globals.set('__ase_tests_json', JSON.stringify(tests));
      const resJson = py.runPython('__ase_run_tests(__ase_user_code, __ase_tests_json)');
      outcomes = JSON.parse(resJson);
    } catch (e) {
      failures.push({ id: p.id, group, file, bad: [{ name: '(harness error)', error: String(e) }] });
      continue;
    }
    totalTests += outcomes.length;
    const bad = outcomes.filter((o) => !o.pass);
    if (bad.length) failures.push({ id: p.id, group, file, bad });
  }

  console.log(`\nvalidate-tests: ${problems.length} coding problems, ${totalTests} tests executed, ${skipped} study-only skipped.`);
  if (failures.length === 0) {
    console.log('✓ ALL GREEN — every reference solution passes all of its tests.');
    process.exit(0);
  }
  console.log(`\n✗ ${failures.length} problem(s) failed:`);
  for (const f of failures) {
    console.log(`\n  [${f.group}] ${f.id}  (${f.file})`);
    for (const b of f.bad) {
      if (b.error) console.log(`    ✗ ${b.name} — error: ${b.error}`);
      else console.log(`    ✗ ${b.name}\n        expected ${b.expectedRepr}\n        got      ${b.actualRepr}`);
    }
  }
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
