'use client';

// components/BankBrowser.tsx — the filterable problem-bank list. Given the full
// bank (loaded server-side and passed in), it filters client-side by topic,
// difficulty, and kind. Kept dumb: no data fetching, just controlled selects
// over an in-memory array. Empty bank (M2) renders an empty-state note.

import { useMemo, useState } from 'react';
import Link from 'next/link';

import { TOPICS } from '@/lib/curriculum';
import type { Problem } from '@/lib/types';

/** The subset of a Problem the browser needs (keeps the client payload small). */
export type BankListItem = {
  id: string;
  title: string;
  topicSlug: string;
  unit: number;
  kind: Problem['kind'];
  difficulty?: string;
};

const KINDS: { value: string; label: string }[] = [
  { value: 'all', label: 'All kinds' },
  { value: 'coding', label: 'Coding' },
  { value: 'code-reading', label: 'Code reading' },
  { value: 'complexity', label: 'Complexity' },
];

const DIFFICULTIES = ['all', 'warmup', 'exam-level', 'stretch'];

export function BankBrowser({ items }: { items: BankListItem[] }) {
  const [topic, setTopic] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [kind, setKind] = useState('all');

  const filtered = useMemo(
    () =>
      items.filter(
        (p) =>
          (topic === 'all' || p.topicSlug === topic) &&
          (difficulty === 'all' || p.difficulty === difficulty) &&
          (kind === 'all' || p.kind === kind),
      ),
    [items, topic, difficulty, kind],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <FilterSelect label="Topic" value={topic} onChange={setTopic}>
          <option value="all">All topics</option>
          {TOPICS.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.number}. {t.title}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect label="Difficulty" value={difficulty} onChange={setDifficulty}>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {d === 'all' ? 'All difficulties' : d}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect label="Kind" value={kind} onChange={setKind}>
          {KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </FilterSelect>
      </div>

      {items.length === 0 ? (
        <p className="rounded border border-dashed border-neutral-300 bg-neutral-50 px-4 py-6 text-center text-sm text-neutral-500">
          The problem bank (3–5 problems per topic across all 26 topics) is authored in M4.
        </p>
      ) : (
        <>
          <p className="text-xs text-neutral-500">
            {filtered.length} of {items.length} problems
          </p>
          <ul className="divide-y divide-neutral-100 rounded border border-neutral-200 bg-white">
            {filtered.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                <div className="min-w-0">
                  <span className="text-neutral-800">{p.title}</span>
                  <span className="ml-2 text-xs text-neutral-400">
                    {p.kind}
                    {p.difficulty ? ` · ${p.difficulty}` : ''}
                  </span>
                </div>
                <Link
                  href={`/bank/${p.id}`}
                  className="shrink-0 rounded border border-neutral-300 px-2 py-0.5 text-xs text-neutral-700 hover:bg-neutral-50"
                >
                  Open →
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col text-xs text-neutral-500">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 rounded border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-800 focus:border-blue-500 focus:outline-none"
      >
        {children}
      </select>
    </label>
  );
}

export default BankBrowser;
