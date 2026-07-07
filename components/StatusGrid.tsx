'use client';

// components/StatusGrid.tsx — the dashboard's unit/topic status grid. One row per
// topic with the 3-state toggle (persisted via useProgress). Grouped by unit so
// Donny can see, at a glance, where each unit stands. Client-only because the
// toggles read/write localStorage.

import Link from 'next/link';

import { UNITS, TOPICS } from '@/lib/curriculum';
import { TopicStatusToggle } from '@/components/TopicStatusToggle';

export function StatusGrid() {
  return (
    <div className="space-y-6">
      {UNITS.map((unit) => (
        <section key={unit.number}>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Unit {unit.number} · {unit.title}
          </h3>
          <ul className="divide-y divide-neutral-100 rounded border border-neutral-200 bg-white">
            {unit.topicSlugs.map((slug) => {
              const topic = TOPICS.find((t) => t.slug === slug);
              if (!topic) return null;
              return (
                <li key={slug} className="flex items-center justify-between gap-4 px-4 py-2">
                  <Link href={`/topics/${slug}`} className="min-w-0 text-sm text-neutral-800 hover:underline">
                    <span className="mr-2 font-mono text-xs text-neutral-400">{topic.number}</span>
                    {topic.title}
                  </Link>
                  <TopicStatusToggle slug={slug} size="sm" />
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default StatusGrid;
