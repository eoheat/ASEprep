'use client';

// components/workspace/Workspace.tsx
//
// The coding workspace: Monaco editor + Run / Run Tests / Reset + output console
// + test results. Monaco is loaded via next/dynamic({ ssr:false }) (App Router
// requirement — it can't render on the server). The draft persists to
// localStorage under `storageKey`; Reset restores `problem.starterCode`.
//
// CONTRACT: the exported `Workspace` name and `WorkspaceProps` signature are
// preserved exactly from the lead's seed — app-builder imports against them.

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { CodingProblem, RunResult, TestOutcome } from '@/lib/types';
import { runCode, runTests, warmRunner } from '@/lib/runner';
import Console from './Console';
import TestResults from './TestResults';

// Monaco must not render on the server (needs DOM + workers).
const Editor = dynamic(() => import('./Editor'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[360px] items-center justify-center rounded border border-neutral-300 bg-neutral-900 font-mono text-xs text-neutral-500">
      Loading editor…
    </div>
  ),
});

export type WorkspaceProps = {
  /** The problem to solve. */
  problem: CodingProblem;
  /** localStorage key for the per-problem draft, e.g. `ase-prep:draft:${problem.id}`. */
  storageKey: string;
  /** Called after a test run so the page can persist pass/total into progress. */
  onResult?: (outcomes: TestOutcome[]) => void;
};

export function Workspace({ problem, storageKey, onResult }: WorkspaceProps) {
  const [code, setCode] = useState<string>(problem.starterCode);
  const [mode, setMode] = useState<'idle' | 'running' | 'testing'>('idle');
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [outcomes, setOutcomes] = useState<TestOutcome[] | null>(null);
  const [testsTimedOut, setTestsTimedOut] = useState(false);
  const busy = mode !== 'idle';

  // Keep the latest code in a ref so the Cmd/Ctrl+Enter handler (bound once in
  // Monaco onMount) always runs the current buffer, not a stale closure.
  const codeRef = useRef(code);
  codeRef.current = code;

  // Load the saved draft (if any) on mount, and warm the Pyodide worker so the
  // first Run isn't a cold start.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) setCode(saved);
    } catch {
      /* localStorage unavailable — fall back to starterCode already in state. */
    }
    warmRunner();
  }, [storageKey]);

  // Persist the draft on every change.
  const onChange = useCallback(
    (next: string) => {
      setCode(next);
      try {
        localStorage.setItem(storageKey, next);
      } catch {
        /* ignore quota/availability errors — drafts are best-effort. */
      }
    },
    [storageKey],
  );

  const runOpts = { pyPackages: problem.pyPackages, dataFiles: problem.dataFiles };

  const handleRun = useCallback(async () => {
    setMode('running');
    setRunResult(null);
    try {
      const result = await runCode(codeRef.current, runOpts);
      setRunResult(result);
    } catch (e) {
      setRunResult({
        stdout: '',
        stderr: '',
        error: e instanceof Error ? e.message : String(e),
        timedOut: false,
        durationMs: 0,
      });
    } finally {
      setMode('idle');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem.id]);

  const handleRunTests = useCallback(async () => {
    setMode('testing');
    setOutcomes(null);
    setTestsTimedOut(false);
    try {
      const results = await runTests(codeRef.current, problem.tests, runOpts);
      setOutcomes(results);
      // An empty array from the runner means the watchdog killed the worker.
      if (results.length === 0 && problem.tests.length > 0) {
        setTestsTimedOut(true);
      }
      onResult?.(results);
    } catch (e) {
      setOutcomes([]);
      setRunResult({
        stdout: '',
        stderr: '',
        error: e instanceof Error ? e.message : String(e),
        timedOut: false,
        durationMs: 0,
      });
    } finally {
      setMode('idle');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem.id, problem.tests, onResult]);

  // Cmd/Ctrl+Enter runs tests. Bound via a ref so Monaco's one-time onMount
  // command always calls the freshest handler.
  const runTestsRef = useRef(handleRunTests);
  runTestsRef.current = handleRunTests;

  const handleReset = useCallback(() => {
    setCode(problem.starterCode);
    setRunResult(null);
    setOutcomes(null);
    setTestsTimedOut(false);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  }, [problem.starterCode, storageKey]);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded border border-neutral-300">
        <Editor
          value={code}
          onChange={onChange}
          onRunTests={() => runTestsRef.current()}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleRun}
          disabled={busy}
          className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {mode === 'running' ? 'Running…' : 'Run'}
        </button>
        <button
          type="button"
          onClick={handleRunTests}
          disabled={busy}
          className="rounded bg-blue-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {mode === 'testing' ? 'Testing…' : 'Run Tests'}
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={busy}
          className="rounded border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 disabled:opacity-40"
        >
          Reset
        </button>
        <span className="ml-auto font-mono text-[11px] text-neutral-400">
          Cmd/Ctrl+Enter runs tests
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <TestResults outcomes={outcomes} running={mode === 'testing'} timedOut={testsTimedOut} />
        <Console result={runResult} running={mode === 'running'} />
      </div>
    </div>
  );
}

export default Workspace;
