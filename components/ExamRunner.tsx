'use client';

// components/ExamRunner.tsx — the timed, auto-graded exam runner (M5).
//
// Renders the variant's problems (coding → Monaco/Pyodide Workspace, short-answer
// → a plain textarea with NO live feedback), a visible countdown that auto-submits
// at zero, and a Submit button. On submit it grades every problem — coding by
// running its full test suite in Pyodide (partial credit = fraction passed),
// short-answer by normalized match — weights the slots (coding heavier, matching
// the blueprint), computes a percentage + PASS/NOT YET verdict via scoreExam,
// saves the attempt to localStorage history, and shows a per-topic breakdown.
//
// No solution is ever revealed here (not during the exam, not on the results
// page) — the real ASE shows no answers.

import { useCallback, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

import { Workspace } from '@/components/workspace/Workspace';
import { ExamTimer } from '@/components/ExamTimer';
import { runTests } from '@/lib/runner';
import { gradeShortAnswer, codingScorePct, scoreExam, type ScoredSlot, type ExamScore } from '@/lib/grading';
import { useProgress } from '@/lib/progress';
import { TOPICS } from '@/lib/curriculum';
import type { Problem, ExamAttempt } from '@/lib/types';

type ExamMeta = {
  id: string;
  title: string;
  timeLimitMinutes: number;
  passThreshold: number;
};

// Slot weights approximate the PLAN §9 blueprint (coding-heavier than short-answer).
const CODING_POINTS = 12;
const SHORT_POINTS = 8;

function topicTitle(slug: string): string {
  return TOPICS.find((t) => t.slug === slug)?.title ?? slug;
}

export function ExamRunner({
  exam,
  variantId,
  problems,
}: {
  exam: ExamMeta;
  variantId: string;
  problems: Problem[];
}) {
  const { addExamAttempt } = useProgress();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<'taking' | 'grading' | 'done'>('taking');
  const [result, setResult] = useState<{ score: ExamScore; slots: ScoredSlot[] } | null>(null);
  const startedAt = useRef<string>(new Date().toISOString());
  const submittedRef = useRef(false);

  const examKey = useCallback(
    (problemId: string) => `ase-prep:exam:${exam.id}:${variantId}:${problemId}`,
    [exam.id, variantId],
  );

  const handleSubmit = useCallback(async () => {
    if (submittedRef.current) return; // guard double-submit (button + timer expiry)
    submittedRef.current = true;
    setPhase('grading');

    const slots: ScoredSlot[] = [];
    for (const problem of problems) {
      if (problem.kind === 'coding') {
        let code: string;
        try {
          code = localStorage.getItem(examKey(problem.id)) ?? problem.starterCode;
        } catch {
          code = problem.starterCode;
        }
        let pct = 0;
        if (problem.tests.length > 0) {
          const outcomes = await runTests(code, problem.tests, {
            pyPackages: problem.pyPackages,
            dataFiles: problem.dataFiles,
          });
          const passed = outcomes.filter((o) => o.pass).length;
          pct = codingScorePct(passed, problem.tests.length);
        }
        slots.push({ problemId: problem.id, topicSlug: problem.topicSlug, unit: problem.unit, scorePct: pct, points: CODING_POINTS });
      } else {
        const correct = gradeShortAnswer(answers[problem.id] ?? '', {
          answer: problem.answer,
          acceptedAnswers: problem.acceptedAnswers,
        });
        slots.push({ problemId: problem.id, topicSlug: problem.topicSlug, unit: problem.unit, scorePct: correct ? 100 : 0, points: SHORT_POINTS });
      }
    }

    const score = scoreExam(slots, exam.passThreshold);
    const attempt: ExamAttempt = {
      id: `${exam.id}:${variantId}:${startedAt.current}`,
      examId: exam.id,
      variantId,
      startedAt: startedAt.current,
      submittedAt: new Date().toISOString(),
      scorePct: score.scorePct,
      passed: score.passed,
      perProblem: slots.map((s) => ({ problemId: s.problemId, topicSlug: s.topicSlug, unit: s.unit, scorePct: s.scorePct })),
    };
    addExamAttempt(attempt);
    setResult({ score, slots });
    setPhase('done');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [answers, exam.id, exam.passThreshold, examKey, problems, variantId, addExamAttempt]);

  // -------------------------------------------------------------------------
  // Results view
  // -------------------------------------------------------------------------
  if (phase === 'done' && result) {
    const { score, slots } = result;
    const pct = Math.round(score.scorePct);
    return (
      <div className="space-y-6">
        <div
          className={`rounded-lg border p-6 ${
            score.passed ? 'border-green-300 bg-green-50' : 'border-amber-300 bg-amber-50'
          }`}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <span className={`text-3xl font-bold ${score.passed ? 'text-green-800' : 'text-amber-800'}`}>
              {score.passed ? 'PASS' : 'NOT YET'}
            </span>
            <span className="font-mono text-2xl tabular-nums text-neutral-800">{pct}%</span>
          </div>
          <p className="mt-2 text-sm text-neutral-600">
            Passing threshold {Math.round(exam.passThreshold * 100)}% (configurable — MIT does not publish the real cutoff).
          </p>
        </div>

        {score.pointsLostByTopic.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Where you lost the most points
            </h3>
            <ul className="space-y-1">
              {score.pointsLostByTopic.slice(0, 5).map((t) => (
                <li key={t.topicSlug} className="flex items-center justify-between rounded border border-neutral-200 bg-white px-3 py-1.5 text-sm">
                  <Link href={`/topics/${t.topicSlug}`} className="text-blue-700 underline hover:text-blue-900">
                    {topicTitle(t.topicSlug)}
                  </Link>
                  <span className="font-mono text-xs text-neutral-500">-{t.pointsLost.toFixed(0)} pts</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">Per-problem breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-neutral-500">
                  <th className="border-b border-neutral-200 px-2 py-1 font-medium">#</th>
                  <th className="border-b border-neutral-200 px-2 py-1 font-medium">Topic</th>
                  <th className="border-b border-neutral-200 px-2 py-1 font-medium">Score</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((s, i) => (
                  <tr key={s.problemId}>
                    <td className="border-b border-neutral-100 px-2 py-1 font-mono text-neutral-500">{i + 1}</td>
                    <td className="border-b border-neutral-100 px-2 py-1">
                      <Link href={`/topics/${s.topicSlug}`} className="text-blue-700 underline hover:text-blue-900">
                        {topicTitle(s.topicSlug)}
                      </Link>
                    </td>
                    <td className="border-b border-neutral-100 px-2 py-1 font-mono tabular-nums">{Math.round(s.scorePct)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex gap-3">
          <Link href="/exams" className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white">
            Back to exams
          </Link>
          <Link href={`/exams/${exam.id}`} className="rounded border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700">
            Other variants
          </Link>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Taking / grading view
  // -------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 bg-white/95 py-2 backdrop-blur">
        <ExamTimer minutes={exam.timeLimitMinutes} onExpire={handleSubmit} running={phase === 'taking'} />
        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-500">{problems.length} problems · no feedback until you submit</span>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={phase !== 'taking'}
            className="rounded bg-green-700 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {phase === 'grading' ? 'Grading…' : 'Submit exam'}
          </button>
        </div>
      </div>

      <ol className="space-y-8">
        {problems.map((problem, i) => (
          <li key={problem.id}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Problem {i + 1} of {problems.length}
              <span className="ml-2 font-normal normal-case text-neutral-400">
                {problem.kind === 'coding' ? 'coding' : problem.kind === 'complexity' ? 'complexity' : 'code reading'}
              </span>
            </p>
            <div className="rounded border border-neutral-200 bg-white p-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-800">{problem.statement}</p>
              {problem.kind !== 'coding' && problem.prompt && (
                <pre className="mt-3 overflow-x-auto rounded border border-neutral-200 bg-neutral-50 p-3 font-mono text-sm">
                  {problem.prompt}
                </pre>
              )}
            </div>
            <div className="mt-3">
              {problem.kind === 'coding' ? (
                <Workspace problem={problem} storageKey={examKey(problem.id)} />
              ) : (
                <textarea
                  value={answers[problem.id] ?? ''}
                  onChange={(e) => setAnswers((a) => ({ ...a, [problem.id]: e.target.value }))}
                  disabled={phase !== 'taking'}
                  rows={2}
                  placeholder="Your answer"
                  className="w-full rounded border border-neutral-300 p-2 font-mono text-sm"
                />
              )}
            </div>
          </li>
        ))}
      </ol>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={phase !== 'taking'}
          className="rounded bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {phase === 'grading' ? 'Grading…' : 'Submit exam'}
        </button>
      </div>
    </div>
  );
}

export default ExamRunner;
