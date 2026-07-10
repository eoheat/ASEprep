'use client';

// lib/progress.ts — progress state with server sync (M7) behind localStorage cache.
//
// Server-authoritative with optimistic UI (PLAN-BACKEND §5). The component-facing
// surface is UNCHANGED — <ProgressProvider> + useProgress() with the same mutators
// — so no consumer changes (§6). The sync seam lives entirely in here:
//
//  - Read:  on mount, paint from the localStorage cache, then pull the full
//           server state and hydrate (server wins). On offline, keep the cache.
//  - Write: each mutator updates local state (optimistic) + the localStorage cache,
//           and enqueues a server push. Topic/result/exam push immediately; drafts
//           debounce ~2.5s. A failed push stays queued and retries on reconnect /
//           next load. Exam attempts are idempotent server-side, so retry never
//           duplicates ("attempts must never be lost").
//
// localStorage is demoted to a cache + offline write queue; the server is the
// source of truth.

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  PROGRESS_KEY,
  ProgressState,
  emptyProgress,
  type ProblemProgress,
  type TopicStatus,
  type ExamAttempt,
} from '@/lib/types';
import {
  pullProgress,
  pushTopicStatus,
  pushProblemResult,
  pushDraft,
} from '@/lib/actions/progress';
import { pushExamAttempt } from '@/lib/actions/exam';

// ---------------------------------------------------------------------------
// Low-level cache persistence (SSR-safe). Unchanged public surface.
// ---------------------------------------------------------------------------

function nowIso(): string {
  return new Date().toISOString();
}

const hasWindow = (): boolean => typeof window !== 'undefined';

/** Read + validate the cached state. Empty on server / first load / corrupt blob. */
export function loadProgress(): ProgressState {
  if (!hasWindow()) return emptyProgress(nowIso());
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(PROGRESS_KEY);
  } catch {
    return emptyProgress(nowIso());
  }
  if (!raw) return emptyProgress(nowIso());
  try {
    const parsed = ProgressState.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
  } catch {
    /* fall through */
  }
  return emptyProgress(nowIso());
}

/** Persist the cache. No-op on the server or if storage is unavailable. */
export function saveProgress(state: ProgressState): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(state));
  } catch {
    /* storage full / disabled */
  }
}

export function exportProgressJson(): string {
  return JSON.stringify(loadProgress(), null, 2);
}

export function importProgressJson(json: string): ProgressState | null {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    return null;
  }
  const parsed = ProgressState.safeParse(value);
  if (!parsed.success) return null;
  saveProgress(parsed.data);
  return parsed.data;
}

// ---------------------------------------------------------------------------
// Sync queue — pending server writes, persisted so they survive a reload/offline.
// ---------------------------------------------------------------------------

const QUEUE_KEY = 'ase-prep:syncq:v1';

type SyncOp =
  | { t: 'topic'; slug: string; status: TopicStatus }
  | { t: 'result'; id: string; passed: number; total: number }
  | { t: 'draft'; id: string; code: string }
  | { t: 'exam'; attempt: ExamAttempt };

function loadQueue(): SyncOp[] {
  if (!hasWindow()) return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as SyncOp[]) : [];
  } catch {
    return [];
  }
}

function persistQueue(q: SyncOp[]): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch {
    /* ignore */
  }
}

async function sendOp(op: SyncOp): Promise<void> {
  switch (op.t) {
    case 'topic':
      return pushTopicStatus(op.slug, op.status);
    case 'result':
      return pushProblemResult(op.id, op.passed, op.total);
    case 'draft':
      return pushDraft(op.id, op.code);
    case 'exam':
      return pushExamAttempt(op.attempt);
  }
}

// ---------------------------------------------------------------------------
// React context
// ---------------------------------------------------------------------------

export type ProgressApi = {
  state: ProgressState;
  /** True once the client has hydrated (from cache, then server). */
  hydrated: boolean;
  setTopicStatus: (slug: string, status: TopicStatus) => void;
  recordProblemResult: (id: string, passed: number, total: number) => void;
  saveDraft: (id: string, draftCode: string) => void;
  addExamAttempt: (attempt: ExamAttempt) => void;
  replaceState: (next: ProgressState) => void;
  resetAll: () => void;
};

const ProgressContext = createContext<ProgressApi | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProgressState>(() => emptyProgress(nowIso()));
  const [hydrated, setHydrated] = useState(false);

  const queueRef = useRef<SyncOp[]>([]);
  const flushingRef = useRef(false);
  const draftTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Flush queued writes in order. A failing op stops the run and stays queued.
  const flush = useCallback(async () => {
    if (flushingRef.current || !hasWindow()) return;
    flushingRef.current = true;
    try {
      while (queueRef.current.length > 0) {
        try {
          await sendOp(queueRef.current[0]);
        } catch {
          break; // offline / server error — retry later
        }
        queueRef.current.shift();
        persistQueue(queueRef.current);
      }
    } finally {
      flushingRef.current = false;
    }
  }, []);

  const enqueue = useCallback(
    (op: SyncOp) => {
      queueRef.current.push(op);
      persistQueue(queueRef.current);
      void flush();
    },
    [flush],
  );

  // Push pending writes, then pull the authoritative server state. Only overwrite
  // local when the queue drained (else local has un-pushed edits to keep showing).
  const sync = useCallback(async () => {
    await flush();
    try {
      const server = await pullProgress();
      if (queueRef.current.length === 0) {
        setState(server);
        saveProgress(server);
      }
    } catch {
      /* offline — keep the cache */
    }
  }, [flush]);

  // Mount: paint cache instantly, load the queue, then sync with the server.
  useEffect(() => {
    setState(loadProgress());
    queueRef.current = loadQueue();
    setHydrated(true);
    void sync();

    const onOnline = () => void sync();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [sync]);

  // Keep the cache in step with local state (after hydration).
  useEffect(() => {
    if (hydrated) saveProgress(state);
  }, [state, hydrated]);

  const setTopicStatus = useCallback(
    (slug: string, status: TopicStatus) => {
      setState((prev) => ({
        ...prev,
        topicStatus: { ...prev.topicStatus, [slug]: status },
        updatedAt: nowIso(),
      }));
      enqueue({ t: 'topic', slug, status });
    },
    [enqueue],
  );

  const recordProblemResult = useCallback(
    (id: string, passed: number, total: number) => {
      setState((prev) => {
        const existing: ProblemProgress | undefined = prev.problems[id];
        const next: ProblemProgress = {
          draftCode: existing?.draftCode,
          solved: (existing?.solved ?? false) || (total > 0 && passed >= total),
          lastPassed: passed,
          lastTotal: total,
          updatedAt: nowIso(),
        };
        return { ...prev, problems: { ...prev.problems, [id]: next }, updatedAt: nowIso() };
      });
      enqueue({ t: 'result', id, passed, total });
    },
    [enqueue],
  );

  const saveDraft = useCallback(
    (id: string, draftCode: string) => {
      setState((prev) => {
        const existing: ProblemProgress | undefined = prev.problems[id];
        const next: ProblemProgress = {
          draftCode,
          solved: existing?.solved ?? false,
          lastPassed: existing?.lastPassed ?? 0,
          lastTotal: existing?.lastTotal ?? 0,
          updatedAt: nowIso(),
        };
        return { ...prev, problems: { ...prev.problems, [id]: next }, updatedAt: nowIso() };
      });
      // Debounce the server write ~2.5s after the last keystroke for this problem.
      const timers = draftTimers.current;
      if (timers[id]) clearTimeout(timers[id]);
      timers[id] = setTimeout(() => enqueue({ t: 'draft', id, code: draftCode }), 2500);
    },
    [enqueue],
  );

  const addExamAttempt = useCallback(
    (attempt: ExamAttempt) => {
      setState((prev) => ({
        ...prev,
        examAttempts: [...prev.examAttempts, attempt],
        updatedAt: nowIso(),
      }));
      enqueue({ t: 'exam', attempt });
    },
    [enqueue],
  );

  // Replace the whole local state (used by import after the DB write). No extra
  // queue op — the import action already wrote every row to the server.
  const replaceState = useCallback((next: ProgressState) => {
    const stamped = { ...next, updatedAt: nowIso() };
    setState(stamped);
    saveProgress(stamped);
  }, []);

  // Clear the LOCAL view + queue. Server rows are left intact (a full account wipe
  // is out of scope); the next load re-pulls from the server.
  const resetAll = useCallback(() => {
    setState(emptyProgress(nowIso()));
    queueRef.current = [];
    persistQueue(queueRef.current);
  }, []);

  const api = useMemo<ProgressApi>(
    () => ({
      state,
      hydrated,
      setTopicStatus,
      recordProblemResult,
      saveDraft,
      addExamAttempt,
      replaceState,
      resetAll,
    }),
    [state, hydrated, setTopicStatus, recordProblemResult, saveDraft, addExamAttempt, replaceState, resetAll],
  );

  return createElement(ProgressContext.Provider, { value: api }, children);
}

/** Access progress state + mutators. Must be used under <ProgressProvider>. */
export function useProgress(): ProgressApi {
  const ctx = useContext(ProgressContext);
  if (!ctx) {
    throw new Error('useProgress must be used within <ProgressProvider>');
  }
  return ctx;
}
