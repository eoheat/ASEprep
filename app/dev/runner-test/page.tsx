'use client';

// app/dev/runner-test/page.tsx
//
// Standalone M3 acceptance / demo route for the runner. Not part of the shipping
// nav — a harness the lead (and qa-verifier) use to confirm client-side Python
// execution works. It exercises the runner directly (runCode / runTests) with
// dedicated buttons per scenario, and also mounts a real <Workspace> so the full
// editor flow is verifiable.
//
// Proves the three M3 acceptance criteria:
//   1. Code runs and stdout shows.
//   2. A deliberately failing test reports expected vs actual.
//   3. `while True: pass` is killed at 10s WITHOUT freezing the page, and a
//      normal run still works right after (eager worker respawn).

import { useState } from 'react';
import type { CodingProblem, RunResult, TestCase } from '@/lib/types';
import { runCode, runTests } from '@/lib/runner';
import { Workspace } from '@/components/workspace/Workspace';

// A tiny CodingProblem so the mounted Workspace has something real to run.
const SAMPLE_PROBLEM: CodingProblem = {
  id: 'dev-sample',
  title: 'Sample: double(n)',
  topicSlug: '01-introduction',
  unit: 1,
  statement: 'Write `double(n)` returning `2 * n`.',
  source: 'bank',
  reconstructed: false,
  kind: 'coding',
  functionSignature: 'def double(n):',
  starterCode: 'def double(n):\n    # return 2 * n\n    return n\n',
  tests: [
    { name: 'double(2) == 4', expression: 'double(2)', expected: '4', compare: 'exact', strictType: false, hidden: false },
    { name: 'double(0) == 0', expression: 'double(0)', expected: '0', compare: 'exact', strictType: false, hidden: false },
    { name: 'hidden: double(-5) == -10', expression: 'double(-5)', expected: '-10', compare: 'exact', strictType: false, hidden: true },
  ],
  solution: 'def double(n):\n    return 2 * n\n',
  pyPackages: [],
  dataFiles: [],
  studyOnly: false,
};

// Scenario 2: a deliberately-wrong solution so a test fails with expected≠actual.
const FAILING_CODE = 'def double(n):\n    return n + 1  # wrong on purpose\n';
const FAILING_TESTS: TestCase[] = [
  { name: 'double(2) == 4', expression: 'double(2)', expected: '4', compare: 'exact', strictType: false, hidden: false },
  { name: 'double(3) == 6', expression: 'double(3)', expected: '6', compare: 'exact', strictType: false, hidden: false },
];

const HELLO_CODE = 'print("hello from pyodide")\nfor i in range(3):\n    print("line", i)\n';
const INFINITE_CODE = 'while True:\n    pass\n';

export default function RunnerTestPage() {
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const append = (line: string) => setLog((prev) => [...prev, line]);

  async function scenario1Hello() {
    setBusy('hello');
    append('▶ Scenario 1 — run hello, expect stdout…');
    const r: RunResult = await runCode(HELLO_CODE);
    append(`   stdout:\n${indent(r.stdout || '(none)')}`);
    append(`   error=${r.error ?? 'null'} timedOut=${r.timedOut} durationMs=${r.durationMs}`);
    setBusy(null);
  }

  async function scenario2FailingTest() {
    setBusy('fail');
    append('▶ Scenario 2 — failing test, expect expected≠actual…');
    const outcomes = await runTests(FAILING_CODE, FAILING_TESTS);
    for (const o of outcomes) {
      append(
        `   [${o.pass ? 'PASS' : 'FAIL'}] ${o.name} — expected ${o.expectedRepr}, actual ${o.actualRepr}` +
          (o.error ? ` (error: ${o.error})` : ''),
      );
    }
    setBusy(null);
  }

  async function scenario3Timeout() {
    setBusy('timeout');
    append('▶ Scenario 3 — infinite loop, expect kill at 10s (page stays responsive)…');
    const started = performance.now();
    const r: RunResult = await runCode(INFINITE_CODE);
    const secs = ((performance.now() - started) / 1000).toFixed(1);
    append(`   timedOut=${r.timedOut} after ~${secs}s`);
    append('   …now a normal run right after (proves eager respawn worked):');
    const r2 = await runCode('print("still alive:", 6 * 7)');
    append(`   stdout: ${r2.stdout.trim() || '(none)'} timedOut=${r2.timedOut}`);
    setBusy(null);
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <header>
        <h1 className="text-lg font-semibold">M3 runner acceptance</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Direct runner checks + a live Workspace. First run pays the Pyodide load
          (~a few seconds); later runs are warm.
        </p>
      </header>

      <section className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={scenario1Hello}
            disabled={busy !== null}
            className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
          >
            1 · Run hello world
          </button>
          <button
            type="button"
            onClick={scenario2FailingTest}
            disabled={busy !== null}
            className="rounded bg-blue-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
          >
            2 · Failing test (expected vs actual)
          </button>
          <button
            type="button"
            onClick={scenario3Timeout}
            disabled={busy !== null}
            className="rounded bg-red-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
          >
            3 · Infinite loop → 10s kill + respawn
          </button>
          <button
            type="button"
            onClick={() => setLog([])}
            disabled={busy !== null}
            className="rounded border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 disabled:opacity-40"
          >
            Clear log
          </button>
        </div>
        {busy && (
          <p className="text-xs text-neutral-500">
            Running scenario “{busy}”… the page stays interactive (try scrolling / clearing).
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Log
        </h2>
        <pre className="min-h-24 whitespace-pre-wrap rounded border border-neutral-300 bg-neutral-50 p-3 font-mono text-xs text-neutral-800">
          {log.length ? log.join('\n') : '(run a scenario)'}
        </pre>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Live Workspace ({SAMPLE_PROBLEM.title})
        </h2>
        <Workspace problem={SAMPLE_PROBLEM} storageKey="ase-prep:draft:dev-sample" />
      </section>
    </main>
  );
}

function indent(s: string): string {
  return s
    .split('\n')
    .map((line) => '     ' + line)
    .join('\n');
}
