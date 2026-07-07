'use client';

// components/ReadinessCard.tsx — the dashboard's ASE readiness score card.
//
// Reads live progress from useProgress() and combines it with content totals
// (passed in from the server, which knows how many pset tests / exam-level bank
// problems exist). computeReadiness is total for empty inputs, so this renders a
// clean 0% in M2 before any content or attempts exist — no NaN.

import Link from 'next/link';

import { useProgress } from '@/lib/progress';
import { computeReadiness, type ReadinessTotals } from '@/lib/readiness';

export function ReadinessCard({ totals }: { totals: ReadinessTotals }) {
  const { state, hydrated } = useProgress();
  const readiness = computeReadiness(state, totals);

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-5">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            ASE readiness
          </h2>
          <p className="mt-1 font-mono text-4xl font-semibold text-neutral-900">
            {hydrated ? readiness.score : 0}
            <span className="text-2xl text-neutral-400">%</span>
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {readiness.readyToBook
              ? 'Last two exams passed — ready to book the ASE.'
              : 'Weighted across exams, psets, bank, and confidence.'}
          </p>
        </div>
        <ReadinessBar score={hydrated ? readiness.score : 0} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
        {readiness.components.map((c) => (
          <div key={c.key}>
            <dt className="text-xs text-neutral-500">
              {c.label} <span className="text-neutral-400">({Math.round(c.weight * 100)}%)</span>
            </dt>
            <dd className="font-mono text-neutral-800">
              {hydrated ? Math.round(c.ratio * 100) : 0}%
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 border-t border-neutral-200 pt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Weakest topics
        </p>
        <ul className="mt-1 flex flex-wrap gap-2 text-sm">
          {readiness.weakestTopics.map((t) => (
            <li key={t.slug}>
              <Link
                href={`/topics/${t.slug}`}
                className="rounded border border-neutral-200 px-2 py-0.5 text-neutral-700 hover:bg-neutral-50"
              >
                {t.title}
                <span className="ml-1 text-xs text-neutral-400">· {t.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ReadinessBar({ score }: { score: number }) {
  return (
    <div
      className="h-24 w-3 shrink-0 overflow-hidden rounded bg-neutral-100"
      role="img"
      aria-label={`Readiness ${score} percent`}
    >
      <div
        className="w-full bg-green-600 transition-[height]"
        style={{ height: `${score}%`, marginTop: `${100 - score}%` }}
      />
    </div>
  );
}

export default ReadinessCard;
