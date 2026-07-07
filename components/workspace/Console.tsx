'use client';

// components/workspace/Console.tsx
//
// Read-only output panel for a `run` (not tests). Shows stdout, stderr, an
// uncaught error, and a timeout banner. Boring by design: monospace, preserves
// whitespace, no interactivity.

import type { RunResult } from '@/lib/types';

export type ConsoleProps = {
  result: RunResult | null;
  running: boolean;
};

export default function Console({ result, running }: ConsoleProps) {
  return (
    <div className="rounded border border-neutral-300 bg-neutral-50">
      <div className="border-b border-neutral-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Output
      </div>
      <div className="max-h-64 overflow-auto p-3 font-mono text-xs leading-relaxed">
        {running && <div className="text-neutral-500">Running…</div>}

        {!running && !result && (
          <div className="text-neutral-400">Run your code to see output.</div>
        )}

        {!running && result?.timedOut && (
          <div className="mb-2 rounded bg-amber-100 px-2 py-1 text-amber-800">
            Timed out after 10s and was killed. Check for an infinite loop.
          </div>
        )}

        {!running && result && (
          <>
            {result.stdout && (
              <pre className="whitespace-pre-wrap text-neutral-800">{result.stdout}</pre>
            )}
            {result.stderr && (
              <pre className="whitespace-pre-wrap text-orange-700">{result.stderr}</pre>
            )}
            {result.error && (
              <pre className="whitespace-pre-wrap text-red-700">{result.error}</pre>
            )}
            {!result.timedOut &&
              !result.stdout &&
              !result.stderr &&
              !result.error && (
                <div className="text-neutral-400">
                  (no output) — ran in {result.durationMs}ms
                </div>
              )}
            {!result.timedOut &&
              (result.stdout || result.stderr || result.error) && (
                <div className="mt-2 text-[10px] text-neutral-400">
                  ran in {result.durationMs}ms
                </div>
              )}
          </>
        )}
      </div>
    </div>
  );
}
