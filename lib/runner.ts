// lib/runner.ts — the ONLY module the UI imports to run Python.
//
// It owns the Web Worker (lib/pyodide-worker.ts), assigns each request a unique
// id, and returns a promise that resolves to a RunResult or TestOutcome[]. It
// also enforces the 10-second watchdog: because Pyodide runs Python
// synchronously, a runaway loop (`while True: pass`) blocks the worker and it
// cannot answer a stop message — so on timeout we worker.terminate() (the only
// reliable kill) and EAGERLY spawn + warm a replacement worker in the
// background, so the next run doesn't pay the full Pyodide load again.
//
// Client-only: this touches the Worker/window globals and must run in the
// browser. Consumers import it from client components.

import type { RunResult, TestOutcome, TestCase, DataFile } from '@/lib/types';

export type RunOptions = {
  pyPackages?: string[];
  dataFiles?: DataFile[];
};

const EXECUTION_TIMEOUT_MS = 10_000;

// ---------------------------------------------------------------------------
// Worker-message shapes (mirror of pyodide-worker.ts).
// ---------------------------------------------------------------------------
type WorkerResponse =
  | { id: number; ok: true; payload: RunResult | TestOutcome[] }
  | { id: number; ok: false; payload: string }
  | { ready: boolean; error?: string };

type Pending = {
  resolve: (value: RunResult | TestOutcome[]) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
  /** Shapes the synthetic result we hand back when a request times out. */
  kind: 'run' | 'runTests';
};

// ---------------------------------------------------------------------------
// Module-singleton worker + bookkeeping. A single worker serves all requests;
// on timeout the whole worker is torn down and replaced (see terminateAndRespawn).
// ---------------------------------------------------------------------------
let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, Pending>();

function createWorker(): Worker {
  // The `new URL(..., import.meta.url)` form is how Next.js/Turbopack/webpack
  // bundle a worker entry. `type: 'module'` matches the ESM worker source.
  const w = new Worker(new URL('./pyodide-worker.ts', import.meta.url), {
    type: 'module',
  });
  w.onmessage = (ev: MessageEvent<WorkerResponse>) => {
    const msg = ev.data;
    // Warm-up / readiness pings carry no id; nothing to settle.
    if (!('id' in msg)) return;
    const p = pending.get(msg.id);
    if (!p) return; // Already settled (e.g. resolved by the watchdog) — ignore.
    clearTimeout(p.timer);
    pending.delete(msg.id);
    if (msg.ok) {
      p.resolve(msg.payload);
    } else {
      p.reject(new Error(msg.payload));
    }
  };
  w.onerror = (ev: ErrorEvent) => {
    // A worker-level error (e.g. failed Pyodide load) can't be tied to one
    // request id, so fail every in-flight request and rebuild.
    const err = new Error(ev.message || 'worker error');
    failAllPending(err);
    terminateAndRespawn();
  };
  return w;
}

function getWorker(): Worker {
  if (!worker) worker = createWorker();
  return worker;
}

function failAllPending(err: Error): void {
  for (const [, p] of pending) {
    clearTimeout(p.timer);
    p.reject(err);
  }
  pending.clear();
}

// Tear down the current worker and eagerly spin up + warm a fresh one so the
// next call doesn't eat the full Pyodide cold-start. Used after a timeout kill
// and after an unrecoverable worker error.
function terminateAndRespawn(): void {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  // Eager warm: creating the worker triggers its top-level getPyodide() load.
  worker = createWorker();
}

// ---------------------------------------------------------------------------
// Core dispatch: post a request, race it against the 10s watchdog.
// ---------------------------------------------------------------------------
function dispatch(
  kind: 'run' | 'runTests',
  body: Record<string, unknown>,
): Promise<RunResult | TestOutcome[]> {
  const w = getWorker();
  const id = nextId++;
  return new Promise<RunResult | TestOutcome[]>((resolve, reject) => {
    const timer = setTimeout(() => {
      // Timeout: the synchronous Python is blocking the worker. Terminate is
      // the only reliable kill. Resolve (not reject) so callers get a clean
      // timedOut result, then respawn a warm worker for the next run.
      pending.delete(id);
      terminateAndRespawn();
      if (kind === 'run') {
        resolve({
          stdout: '',
          stderr: '',
          error: null,
          timedOut: true,
          durationMs: EXECUTION_TIMEOUT_MS,
        } satisfies RunResult);
      } else {
        // No partial outcomes are recoverable once the worker is gone; report
        // an empty batch so the UI can show a "timed out" banner.
        resolve([] as TestOutcome[]);
      }
    }, EXECUTION_TIMEOUT_MS);

    pending.set(id, { resolve, reject, timer, kind });
    w.postMessage({ id, kind, ...body });
  });
}

// ---------------------------------------------------------------------------
// Public API — the surface the workspace UI depends on.
// ---------------------------------------------------------------------------

/** Run a Python program; capture stdout/stderr; honor the 10s watchdog. */
export async function runCode(code: string, opts: RunOptions = {}): Promise<RunResult> {
  const result = await dispatch('run', {
    code,
    pyPackages: opts.pyPackages,
    dataFiles: opts.dataFiles,
  });
  return result as RunResult;
}

/** Run the test harness over `tests`; return one outcome per test. */
export async function runTests(
  code: string,
  tests: TestCase[],
  opts: RunOptions = {},
): Promise<TestOutcome[]> {
  const result = await dispatch('runTests', {
    code,
    tests,
    pyPackages: opts.pyPackages,
    dataFiles: opts.dataFiles,
  });
  return result as TestOutcome[];
}

/**
 * Eagerly create + warm the worker (e.g. on workspace mount) so the first Run
 * isn't a cold start. Safe to call repeatedly — no-op if a worker already lives.
 */
export function warmRunner(): void {
  getWorker();
}
