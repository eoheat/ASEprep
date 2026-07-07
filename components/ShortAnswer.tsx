'use client';

// components/ShortAnswer.tsx — the input + grader for code-reading and
// complexity problems (the short-answer question styles the ASE uses).
//
// The student types an answer; "Check" grades it via gradeShortAnswer (normalized
// exact match against the canonical + accepted answers). On a correct answer we
// record it as solved through useProgress so it counts toward readiness; the
// worked explanation (if any) is revealed after grading. No answer is shown
// before the student submits.

import { useState } from 'react';

import { gradeShortAnswer } from '@/lib/grading';
import { useProgress } from '@/lib/progress';
import type { CodeReadingProblem, ComplexityProblem } from '@/lib/types';

type ShortAnswerProblem = CodeReadingProblem | ComplexityProblem;

export function ShortAnswer({ problem }: { problem: ShortAnswerProblem }) {
  const { recordProblemResult } = useProgress();
  const [value, setValue] = useState('');
  const [verdict, setVerdict] = useState<'unchecked' | 'correct' | 'incorrect'>('unchecked');

  function onCheck() {
    const ok = gradeShortAnswer(value, {
      answer: problem.answer,
      acceptedAnswers: problem.acceptedAnswers,
    });
    setVerdict(ok ? 'correct' : 'incorrect');
    // 1/1 tests passed on a correct answer; 0/1 otherwise. Feeds readiness.
    recordProblemResult(problem.id, ok ? 1 : 0, 1);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      onCheck();
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            problem.kind === 'complexity' ? 'e.g. O(n log n)' : 'Type the exact output / value'
          }
          className="w-full rounded border border-neutral-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none"
          aria-label="Your answer"
        />
        <button
          type="button"
          onClick={onCheck}
          className="shrink-0 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          Check
        </button>
      </div>

      {verdict !== 'unchecked' && (
        <div
          className={
            verdict === 'correct'
              ? 'rounded border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800'
              : 'rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800'
          }
        >
          <p className="font-medium">{verdict === 'correct' ? 'Correct' : 'Not quite'}</p>
          {verdict === 'correct' ? (
            <p className="mt-1">
              Answer: <span className="font-mono">{problem.answer}</span>
            </p>
          ) : (
            <p className="mt-1 text-neutral-600">Try again — check your reasoning.</p>
          )}
          {verdict === 'correct' && problem.explanation && (
            <p className="mt-2 text-neutral-700">{problem.explanation}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default ShortAnswer;
