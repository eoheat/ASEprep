'use client';

// components/workspace/TestResults.tsx
//
// Pass/fail list for a `runTests` run. On failure it shows expected vs actual
// (repr from Python) — EXCEPT for hidden tests, whose expression/expected are
// never revealed pre-submit (they still grade). A raising test shows its error.

import type { TestOutcome } from '@/lib/types';

export type TestResultsProps = {
  outcomes: TestOutcome[] | null;
  running: boolean;
  /** True when the last test run was killed by the 10s watchdog. */
  timedOut?: boolean;
};

export default function TestResults({ outcomes, running, timedOut }: TestResultsProps) {
  const passed = outcomes?.filter((o) => o.pass).length ?? 0;
  const total = outcomes?.length ?? 0;

  return (
    <div className="rounded border border-neutral-300 bg-neutral-50">
      <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Tests
        </span>
        {!running && outcomes && total > 0 && (
          <span
            className={`text-xs font-semibold ${
              passed === total ? 'text-green-700' : 'text-red-700'
            }`}
          >
            {passed}/{total} passed
          </span>
        )}
      </div>

      <div className="max-h-72 overflow-auto p-2 font-mono text-xs">
        {running && <div className="p-2 text-neutral-500">Running tests…</div>}

        {!running && timedOut && (
          <div className="m-1 rounded bg-amber-100 px-2 py-1 text-amber-800">
            Test run timed out after 10s and was killed. Check for an infinite loop.
          </div>
        )}

        {!running && !timedOut && !outcomes && (
          <div className="p-2 text-neutral-400">Run tests to grade your solution.</div>
        )}

        {!running &&
          outcomes?.map((o, i) => (
            <div
              key={i}
              className="mb-1 rounded border border-neutral-200 bg-white px-2 py-1.5"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block w-10 shrink-0 font-semibold ${
                    o.pass ? 'text-green-700' : 'text-red-700'
                  }`}
                >
                  {o.pass ? 'PASS' : 'FAIL'}
                </span>
                <span className="truncate text-neutral-800">
                  {o.name}
                  {o.hidden && (
                    <span className="ml-1 text-neutral-400">(hidden)</span>
                  )}
                </span>
              </div>

              {/* Failure detail. Hidden tests never reveal expected/actual. */}
              {!o.pass && !o.hidden && (
                <div className="mt-1 space-y-0.5 pl-12 text-[11px]">
                  {o.error ? (
                    <div className="text-red-700">error: {o.error}</div>
                  ) : (
                    <>
                      <div className="text-neutral-600">
                        expected: <span className="text-neutral-900">{o.expectedRepr}</span>
                      </div>
                      <div className="text-neutral-600">
                        actual: <span className="text-neutral-900">{o.actualRepr}</span>
                      </div>
                    </>
                  )}
                </div>
              )}
              {!o.pass && o.hidden && o.error && (
                <div className="mt-1 pl-12 text-[11px] text-red-700">
                  error: {o.error}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
