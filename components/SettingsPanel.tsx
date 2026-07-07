'use client';

// components/SettingsPanel.tsx — the interactive Settings UI:
//   - Export progress as a JSON file (download) and copy-to-clipboard.
//   - Import progress from a pasted/loaded JSON blob (validated before applying).
//   - Reset all progress (with confirm).
//   - Exam default knobs: timer minutes + pass threshold. These are user
//     overrides stored under a small separate key; the M5 exam runner reads them.
//
// Progress round-trips go through lib/progress (the single owner of the versioned
// progress key). Settings knobs are cosmetic defaults, kept in their own key so
// they never interfere with the validated ProgressState.

import { useEffect, useRef, useState } from 'react';

import { useProgress } from '@/lib/progress';
import { exportProgressJson, importProgressJson } from '@/lib/progress';
import { DEFAULT_EXAM_MINUTES, DEFAULT_PASS_THRESHOLD } from '@/lib/types';

const SETTINGS_KEY = 'ase-prep:settings:v1';

type ExamSettings = { timerMinutes: number; passThresholdPct: number };

function loadSettings(): ExamSettings {
  const fallback = {
    timerMinutes: DEFAULT_EXAM_MINUTES,
    passThresholdPct: Math.round(DEFAULT_PASS_THRESHOLD * 100),
  };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<ExamSettings>;
    return {
      timerMinutes: clampInt(parsed.timerMinutes, 1, 600, fallback.timerMinutes),
      passThresholdPct: clampInt(parsed.passThresholdPct, 0, 100, fallback.passThresholdPct),
    };
  } catch {
    return fallback;
  }
}

function clampInt(v: unknown, lo: number, hi: number, dflt: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return dflt;
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

export function SettingsPanel() {
  const { replaceState, resetAll } = useProgress();
  const [settings, setSettings] = useState<ExamSettings>({
    timerMinutes: DEFAULT_EXAM_MINUTES,
    passThresholdPct: Math.round(DEFAULT_PASS_THRESHOLD * 100),
  });
  const [importText, setImportText] = useState('');
  const [message, setMessage] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  function persistSettings(next: ExamSettings) {
    setSettings(next);
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch {
      /* ignore storage failures on a personal tool */
    }
  }

  function onExportDownload() {
    const blob = new Blob([exportProgressJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ase-prep-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage({ tone: 'ok', text: 'Progress exported.' });
  }

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(exportProgressJson());
      setMessage({ tone: 'ok', text: 'Progress JSON copied to clipboard.' });
    } catch {
      setMessage({ tone: 'err', text: 'Clipboard unavailable — use Download instead.' });
    }
  }

  function onImport() {
    const next = importProgressJson(importText);
    if (!next) {
      setMessage({ tone: 'err', text: 'Import failed: not a valid ase-prep progress file.' });
      return;
    }
    replaceState(next);
    setImportText('');
    setMessage({ tone: 'ok', text: 'Progress imported.' });
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImportText(String(reader.result ?? ''));
    reader.readAsText(file);
  }

  function onReset() {
    if (window.confirm('Reset ALL progress? This cannot be undone (export first to back up).')) {
      resetAll();
      setMessage({ tone: 'ok', text: 'All progress reset.' });
    }
  }

  return (
    <div className="space-y-8">
      {message && (
        <p
          className={
            message.tone === 'ok'
              ? 'rounded border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800'
              : 'rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800'
          }
        >
          {message.text}
        </p>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">Backup</h2>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onExportDownload} className={btnPrimary}>
            Export JSON (download)
          </button>
          <button type="button" onClick={onCopy} className={btnSecondary}>
            Copy JSON
          </button>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">Restore</h2>
        <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={onFile} className="mb-2 block text-sm" />
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="…or paste exported progress JSON here"
          rows={5}
          className="w-full rounded border border-neutral-300 p-2 font-mono text-xs focus:border-blue-500 focus:outline-none"
        />
        <button type="button" onClick={onImport} disabled={!importText.trim()} className={`${btnPrimary} mt-2 disabled:opacity-50`}>
          Import
        </button>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">Exam defaults</h2>
        <p className="mb-3 text-xs text-neutral-500">
          MIT does not publish the real ASE length or pass cutoff. Defaults: {DEFAULT_EXAM_MINUTES} min,{' '}
          {Math.round(DEFAULT_PASS_THRESHOLD * 100)}%. Adjust to your study target.
        </p>
        <div className="flex flex-wrap gap-6">
          <label className="flex flex-col text-sm text-neutral-700">
            Timer (minutes)
            <input
              type="number"
              min={1}
              max={600}
              value={settings.timerMinutes}
              onChange={(e) => persistSettings({ ...settings, timerMinutes: clampInt(e.target.value, 1, 600, settings.timerMinutes) })}
              className="mt-1 w-28 rounded border border-neutral-300 px-2 py-1 font-mono text-sm focus:border-blue-500 focus:outline-none"
            />
          </label>
          <label className="flex flex-col text-sm text-neutral-700">
            Pass threshold (%)
            <input
              type="number"
              min={0}
              max={100}
              value={settings.passThresholdPct}
              onChange={(e) =>
                persistSettings({ ...settings, passThresholdPct: clampInt(e.target.value, 0, 100, settings.passThresholdPct) })
              }
              className="mt-1 w-28 rounded border border-neutral-300 px-2 py-1 font-mono text-sm focus:border-blue-500 focus:outline-none"
            />
          </label>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-red-700">Danger zone</h2>
        <button type="button" onClick={onReset} className="rounded border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
          Reset all progress
        </button>
      </section>
    </div>
  );
}

const btnPrimary =
  'rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';
const btnSecondary =
  'rounded border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';

export default SettingsPanel;
