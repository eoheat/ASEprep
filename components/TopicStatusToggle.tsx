'use client';

// components/TopicStatusToggle.tsx — a 3-state control for a topic's status.
//
// not-started / reviewed / confident, persisted through useProgress(). Rendered
// on the topic page and (compact) in the dashboard status grid. Before the
// client hydrates we show the empty default so server and client markup agree.

import { useProgress } from '@/lib/progress';
import type { TopicStatus } from '@/lib/types';

const OPTIONS: { value: TopicStatus; label: string }[] = [
  { value: 'not-started', label: 'Not started' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'confident', label: 'Confident' },
];

export function TopicStatusToggle({ slug, size = 'md' }: { slug: string; size?: 'sm' | 'md' }) {
  const { state, hydrated, setTopicStatus } = useProgress();
  const current: TopicStatus = state.topicStatus[slug] ?? 'not-started';

  const pad = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <div role="group" aria-label="Topic status" className="inline-flex overflow-hidden rounded border border-neutral-300">
      {OPTIONS.map((opt, i) => {
        const active = hydrated && current === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTopicStatus(slug, opt.value)}
            aria-pressed={active}
            className={[
              pad,
              i > 0 ? 'border-l border-neutral-300' : '',
              'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500',
              active
                ? statusActiveClass(opt.value)
                : 'bg-white text-neutral-600 hover:bg-neutral-100',
            ].join(' ')}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function statusActiveClass(status: TopicStatus): string {
  switch (status) {
    case 'confident':
      return 'bg-green-600 text-white';
    case 'reviewed':
      return 'bg-blue-600 text-white';
    default:
      return 'bg-neutral-600 text-white';
  }
}

export default TopicStatusToggle;
