// lib/pyodide-worker.ts — the dedicated Web Worker that owns the Pyodide runtime.
//
// User code ALWAYS runs here, never on the main thread and never via eval
// (CLAUDE.md). The worker loads Pyodide once and caches it, then answers two
// request kinds: 'run' (execute code, capture stdout/stderr) and 'runTests'
// (execute the test harness and return per-test outcomes).
//
// Why a worker at all: Pyodide runs Python *synchronously*. A `while True: pass`
// blocks the worker's event loop, so it can never answer a "please stop"
// message. The only reliable kill is worker.terminate() from the main thread —
// which is why runner.ts, not this file, owns the 10s watchdog. This file just
// runs code as fast as it can and reports back.
//
// PROTOCOL
//   main -> worker: { id, kind: 'run' | 'runTests', code, tests?, pyPackages?, dataFiles? }
//   worker -> main: { id, ok, payload }  where payload is a RunResult (run)
//                   or a TestOutcome[] (runTests); ok=false carries a fatal error.
//   worker -> main: { ready: true }      one-time signal once Pyodide is warm.

import type { RunResult, TestOutcome, TestCase, DataFile } from '@/lib/types';
// The Python test harness is the SINGLE source of truth shared with
// scripts/validate-tests.mjs, so the Node validator grades identically to this
// in-browser runner. See lib/py/harness.mjs.
import { HARNESS_PY } from './py/harness.mjs';

// ---------------------------------------------------------------------------
// Pyodide source — SELF-HOSTED from /public/pyodide (vendored at build by
// scripts/vendor-assets.mjs), so the deployed app makes zero CDN requests and
// works offline (M6). This is the exact same `pyodide` npm dist that
// scripts/validate-tests.mjs runs in Node, so the browser and the Node validator
// execute on the identical runtime. Root-relative so it resolves against the
// deploy origin. loadPyodide reads pyodide.asm.wasm, python_stdlib.zip,
// pyodide-lock.json, and the numpy/Pillow wheels from here.
// ---------------------------------------------------------------------------
const PYODIDE_INDEX_URL = '/pyodide/';

// Pyodide is loaded via importScripts from the CDN; loadPyodide is then global.
declare const loadPyodide: (opts: { indexURL: string }) => Promise<PyodideApi>;

// Minimal surface of the Pyodide API we actually touch. Kept local so this file
// has no dependency on @types beyond what the worker needs.
interface PyodideApi {
  loadPackage(names: string[]): Promise<void>;
  runPython(code: string): unknown;
  runPythonAsync(code: string): Promise<unknown>;
  setStdout(opts: { batched: (s: string) => void }): void;
  setStderr(opts: { batched: (s: string) => void }): void;
  globals: { get(name: string): unknown; set(name: string, value: unknown): void };
  FS: {
    writeFile(path: string, data: string | Uint8Array, opts?: { encoding: string }): void;
  };
}

// ---------------------------------------------------------------------------
// Request/response shapes (worker-internal; the main-thread mirror lives in
// runner.ts). Kept structurally identical.
// ---------------------------------------------------------------------------
type RunOpts = { pyPackages?: string[]; dataFiles?: DataFile[] };
type WorkerRequest =
  | ({ id: number; kind: 'run'; code: string } & RunOpts)
  | ({ id: number; kind: 'runTests'; code: string; tests: TestCase[] } & RunOpts);

// ---------------------------------------------------------------------------
// stdout/stderr capture. Pyodide's setStdout/setStderr batch callbacks append
// into these buffers; we snapshot and clear them around each request.
// ---------------------------------------------------------------------------
let stdoutBuf = '';
let stderrBuf = '';

let pyodideReadyPromise: Promise<PyodideApi> | null = null;

async function getPyodide(): Promise<PyodideApi> {
  if (pyodideReadyPromise) return pyodideReadyPromise;
  pyodideReadyPromise = (async () => {
    // importScripts pulls pyodide.js from the CDN and exposes global loadPyodide.
    // (self.importScripts is the classic-worker loader.)
    (self as unknown as { importScripts: (url: string) => void }).importScripts(
      `${PYODIDE_INDEX_URL}pyodide.js`,
    );
    const py = await loadPyodide({ indexURL: PYODIDE_INDEX_URL });
    py.setStdout({ batched: (s: string) => { stdoutBuf += s + '\n'; } });
    py.setStderr({ batched: (s: string) => { stderrBuf += s + '\n'; } });
    // Install the Python-side test harness once. It exposes __ase_run_tests__.
    py.runPython(HARNESS_PY);
    return py;
  })();
  return pyodideReadyPromise;
}

// ---------------------------------------------------------------------------
// FS + packages setup shared by 'run' and 'runTests'.
// ---------------------------------------------------------------------------
async function prepare(py: PyodideApi, opts: RunOpts): Promise<void> {
  const pkgs = opts.pyPackages ?? [];
  if (pkgs.length > 0) {
    await py.loadPackage(pkgs);
  }
  for (const file of opts.dataFiles ?? []) {
    if (file.text !== undefined) {
      // Inline text (data files AND auxiliary .py modules so `import ps4b` works).
      py.FS.writeFile(file.name, file.text, { encoding: 'utf8' });
    } else if (file.url) {
      // Binary/text asset served from /public — fetch as bytes and write raw.
      const resp = await fetch(file.url);
      if (!resp.ok) {
        throw new Error(`dataFile fetch failed (${resp.status}) for ${file.url}`);
      }
      const bytes = new Uint8Array(await resp.arrayBuffer());
      py.FS.writeFile(file.name, bytes);
    } else {
      throw new Error(`dataFile "${file.name}" has neither text nor url`);
    }
  }
}

// The Python test harness (__ase_run_tests + comparison functions) is imported
// from ./py/harness.mjs (see the import at the top of this file) and run once at
// warm-up in getPyodide(). That module is the single source of truth shared with
// scripts/validate-tests.mjs so the Node validator grades identically.

// ---------------------------------------------------------------------------
// Handlers.
// ---------------------------------------------------------------------------
async function handleRun(req: Extract<WorkerRequest, { kind: 'run' }>): Promise<RunResult> {
  const started = performance.now();
  const py = await getPyodide();
  await prepare(py, req);
  stdoutBuf = '';
  stderrBuf = '';
  let error: string | null = null;
  try {
    // runPythonAsync supports top-level await and lets loadPackagesFromImports-
    // free code run; we already loaded declared packages in prepare().
    await py.runPythonAsync(req.code);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  return {
    stdout: stdoutBuf,
    stderr: stderrBuf,
    error,
    timedOut: false, // the watchdog in runner.ts owns timeout; never set here.
    durationMs: Math.round(performance.now() - started),
  };
}

async function handleRunTests(
  req: Extract<WorkerRequest, { kind: 'runTests' }>,
): Promise<TestOutcome[]> {
  const py = await getPyodide();
  await prepare(py, req);
  stdoutBuf = '';
  stderrBuf = '';
  // Marshal args across the JS/Python boundary as strings to avoid proxy churn.
  py.globals.set('__ase_user_code', req.code);
  py.globals.set('__ase_tests_json', JSON.stringify(req.tests));
  const resultJson = py.runPython(
    '__ase_run_tests(__ase_user_code, __ase_tests_json)',
  ) as string;
  return JSON.parse(resultJson) as TestOutcome[];
}

// ---------------------------------------------------------------------------
// Message pump.
// ---------------------------------------------------------------------------
self.onmessage = async (ev: MessageEvent<WorkerRequest>) => {
  const req = ev.data;
  try {
    let payload: RunResult | TestOutcome[];
    if (req.kind === 'run') {
      payload = await handleRun(req);
    } else {
      payload = await handleRunTests(req);
    }
    (self as unknown as { postMessage: (m: unknown) => void }).postMessage({
      id: req.id,
      ok: true,
      payload,
    });
  } catch (e) {
    (self as unknown as { postMessage: (m: unknown) => void }).postMessage({
      id: req.id,
      ok: false,
      payload: e instanceof Error ? e.message : String(e),
    });
  }
};

// Warm Pyodide eagerly so the first user run is fast, and announce readiness so
// runner.ts can pre-warm a replacement worker after a terminate() kill.
getPyodide()
  .then(() => {
    (self as unknown as { postMessage: (m: unknown) => void }).postMessage({ ready: true });
  })
  .catch((e) => {
    (self as unknown as { postMessage: (m: unknown) => void }).postMessage({
      ready: false,
      error: e instanceof Error ? e.message : String(e),
    });
  });
