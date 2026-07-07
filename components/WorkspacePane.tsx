'use client';

// components/WorkspacePane.tsx — the client wrapper every coding-problem route
// renders. It owns the glue between the runner-owned <Workspace> and the app:
//   - builds the per-problem localStorage draft key,
//   - forwards test outcomes into progress (recordProblemResult),
//   - installs the Cmd/Ctrl+Enter "run tests" keyboard intent.
//
// The runner track implements the actual Monaco + Pyodide UI inside <Workspace>
// (imported by contract). The keyboard handler here dispatches a window
// CustomEvent ('ase:run-tests') that the runner integration listens for; until
// then it is a harmless no-op, satisfying the M2 keyboard requirement without
// reaching into runner internals.

import { useCallback, useEffect } from 'react';

import { Workspace } from '@/components/workspace/Workspace';
import { useProgress } from '@/lib/progress';
import type { CodingProblem, TestOutcome } from '@/lib/types';

/** Event name the runner integration can listen for to trigger a test run. */
export const RUN_TESTS_EVENT = 'ase:run-tests';

export function WorkspacePane({ problem }: { problem: CodingProblem }) {
  const { recordProblemResult } = useProgress();

  const onResult = useCallback(
    (outcomes: TestOutcome[]) => {
      const passed = outcomes.filter((o) => o.pass).length;
      recordProblemResult(problem.id, passed, outcomes.length);
    },
    [problem.id, recordProblemResult],
  );

  // Cmd/Ctrl+Enter = "run tests" intent (MASTER_PROMPT UI direction).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent(RUN_TESTS_EVENT, { detail: { problemId: problem.id } }));
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [problem.id]);

  return (
    <div>
      <Workspace problem={problem} storageKey={`ase-prep:draft:${problem.id}`} onResult={onResult} />
      <p className="mt-2 text-xs text-neutral-400">
        Tip: press{' '}
        <kbd className="rounded border border-neutral-300 bg-neutral-50 px-1 font-mono">⌘/Ctrl</kbd>{' '}
        +{' '}
        <kbd className="rounded border border-neutral-300 bg-neutral-50 px-1 font-mono">Enter</kbd>{' '}
        to run tests.
      </p>
    </div>
  );
}

export default WorkspacePane;
