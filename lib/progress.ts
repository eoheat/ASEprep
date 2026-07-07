'use client';

// lib/progress.ts — localStorage-backed progress state + a React context/hook.
//
// All persisted state lives under a single versioned key (PROGRESS_KEY =
// "ase-prep:v1"). This module is the ONLY place that touches that key. It is
// SSR-safe: every window/localStorage access is guarded, so importing it on the
// server (or first client render) yields emptyProgress() rather than crashing.
//
// Public surface:
//  - loadProgress() / saveProgress()        low-level read/write (guarded)
//  - exportProgressJson() / importProgressJson()  backup round-trip
//  - <ProgressProvider>                     wraps the app, holds live state
//  - useProgress()                          hook: state + mutators used by UI
//
// The mutators are intentionally small and explicit (CLAUDE.md): set a topic's
// status, record a problem's test result, reset everything.

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

// ---------------------------------------------------------------------------
// Low-level persistence (SSR-safe)
// ---------------------------------------------------------------------------

function nowIso(): string {
  return new Date().toISOString();
}

const hasWindow = (): boolean => typeof window !== 'undefined';

/**
 * Read + validate the persisted state. On the server, on first load, or when
 * the stored blob is missing/corrupt/from a future version, returns a fresh
 * empty state. Never throws.
 */
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
    // fall through to empty on JSON errors
  }
  return emptyProgress(nowIso());
}

/** Persist state. No-op on the server or if storage is unavailable. */
export function saveProgress(state: ProgressState): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(state));
  } catch {
    // storage full / disabled — surface nothing; this is a personal tool.
  }
}

/** Serialize the current stored state as pretty JSON for the export button. */
export function exportProgressJson(): string {
  return JSON.stringify(loadProgress(), null, 2);
}

/**
 * Validate + persist an imported JSON blob. Returns the accepted state, or null
 * (and writes nothing) if the blob is not a valid ProgressState.
 */
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
// React context
// ---------------------------------------------------------------------------

export type ProgressApi = {
  state: ProgressState;
  /** True once the client has hydrated from localStorage (avoids SSR flash). */
  hydrated: boolean;
  setTopicStatus: (slug: string, status: TopicStatus) => void;
  /** Record a coding-problem test run (updates solved / lastPassed / lastTotal). */
  recordProblemResult: (id: string, passed: number, total: number) => void;
  /** Persist a per-problem editor draft. */
  saveDraft: (id: string, draftCode: string) => void;
  addExamAttempt: (attempt: ExamAttempt) => void;
  /** Replace the whole state (used by import). */
  replaceState: (next: ProgressState) => void;
  resetAll: () => void;
};

const ProgressContext = createContext<ProgressApi | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  // Start from empty (matches server render), then hydrate on mount.
  const [state, setState] = useState<ProgressState>(() => emptyProgress(nowIso()));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(loadProgress());
    setHydrated(true);
  }, []);

  // Persist on every change once hydrated (skip the initial empty state so we
  // don't clobber stored data before hydration completes).
  useEffect(() => {
    if (hydrated) saveProgress(state);
  }, [state, hydrated]);

  const setTopicStatus = useCallback((slug: string, status: TopicStatus) => {
    setState((prev) => ({
      ...prev,
      topicStatus: { ...prev.topicStatus, [slug]: status },
      updatedAt: nowIso(),
    }));
  }, []);

  const recordProblemResult = useCallback((id: string, passed: number, total: number) => {
    setState((prev) => {
      const existing: ProblemProgress | undefined = prev.problems[id];
      const next: ProblemProgress = {
        draftCode: existing?.draftCode,
        solved: (existing?.solved ?? false) || (total > 0 && passed >= total),
        lastPassed: passed,
        lastTotal: total,
        updatedAt: nowIso(),
      };
      return {
        ...prev,
        problems: { ...prev.problems, [id]: next },
        updatedAt: nowIso(),
      };
    });
  }, []);

  const saveDraft = useCallback((id: string, draftCode: string) => {
    setState((prev) => {
      const existing: ProblemProgress | undefined = prev.problems[id];
      const next: ProblemProgress = {
        draftCode,
        solved: existing?.solved ?? false,
        lastPassed: existing?.lastPassed ?? 0,
        lastTotal: existing?.lastTotal ?? 0,
        updatedAt: nowIso(),
      };
      return {
        ...prev,
        problems: { ...prev.problems, [id]: next },
        updatedAt: nowIso(),
      };
    });
  }, []);

  const addExamAttempt = useCallback((attempt: ExamAttempt) => {
    setState((prev) => ({
      ...prev,
      examAttempts: [...prev.examAttempts, attempt],
      updatedAt: nowIso(),
    }));
  }, []);

  const replaceState = useCallback((next: ProgressState) => {
    setState({ ...next, updatedAt: nowIso() });
  }, []);

  const resetAll = useCallback(() => {
    setState(emptyProgress(nowIso()));
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
    [
      state,
      hydrated,
      setTopicStatus,
      recordProblemResult,
      saveDraft,
      addExamAttempt,
      replaceState,
      resetAll,
    ],
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
