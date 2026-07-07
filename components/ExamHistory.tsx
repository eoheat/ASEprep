'use client';

// components/ExamHistory.tsx — attempt history + a simple score-over-time view,
// read from progress (localStorage). In M2 there are no attempts, so it renders
// an empty-state note. The full timed runner + grading lands in M5; this just
// surfaces whatever attempts exist.

import { useProgress } from '@/lib/progress';

export function ExamHistory() {
  const { state, hydrated } = useProgress();
  const attempts = [...state.examAttempts].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));

  if (!hydrated || attempts.length === 0) {
    return (
      <p className="rounded border border-dashed border-neutral-300 bg-neutral-50 px-4 py-4 text-sm text-neutral-500">
        No exam attempts yet. Take a practice exam to start tracking your score over time.
      </p>
    );
  }

  const max = Math.max(...attempts.map((a) => a.scorePct), 100);

  return (
    <div className="space-y-4">
      {/* Minimal bar-per-attempt score-over-time (no chart lib). */}
      <div className="flex items-end gap-1" role="img" aria-label="Score over time">
        {attempts.map((a) => (
          <div
            key={a.id}
            title={`${a.scorePct}% · ${new Date(a.submittedAt).toLocaleDateString()}`}
            className={`w-4 rounded-t ${a.passed ? 'bg-green-600' : 'bg-neutral-400'}`}
            style={{ height: `${Math.max(4, (a.scorePct / max) * 96)}px` }}
          />
        ))}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
            <th className="py-1 pr-3 font-medium">Date</th>
            <th className="py-1 pr-3 font-medium">Exam</th>
            <th className="py-1 pr-3 font-medium">Score</th>
            <th className="py-1 font-medium">Result</th>
          </tr>
        </thead>
        <tbody>
          {attempts.map((a) => (
            <tr key={a.id} className="border-t border-neutral-100">
              <td className="py-1 pr-3 text-neutral-600">{new Date(a.submittedAt).toLocaleDateString()}</td>
              <td className="py-1 pr-3 text-neutral-800">
                {a.examId} · {a.variantId}
              </td>
              <td className="py-1 pr-3 font-mono text-neutral-800">{a.scorePct}%</td>
              <td className="py-1">
                <span className={a.passed ? 'text-green-700' : 'text-red-700'}>
                  {a.passed ? 'PASS' : 'NOT YET'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ExamHistory;
