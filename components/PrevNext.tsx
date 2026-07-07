// components/PrevNext.tsx — previous/next topic footer nav on topic pages.
//
// Fed by curriculum's topicPrevNext(). Either side may be absent (first/last
// topic), so each link renders only when present. Server component.

import Link from 'next/link';

import type { TopicMeta } from '@/lib/types';

export function PrevNext({ prev, next }: { prev?: TopicMeta; next?: TopicMeta }) {
  return (
    <nav aria-label="Topic navigation" className="mt-8 flex items-stretch justify-between gap-4 border-t border-neutral-200 pt-4">
      <div className="flex-1">
        {prev && (
          <Link
            href={`/topics/${prev.slug}`}
            className="block rounded border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50"
          >
            <span className="block text-xs text-neutral-500">← Previous</span>
            <span className="text-neutral-800">
              {prev.number}. {prev.title}
            </span>
          </Link>
        )}
      </div>
      <div className="flex-1 text-right">
        {next && (
          <Link
            href={`/topics/${next.slug}`}
            className="block rounded border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50"
          >
            <span className="block text-xs text-neutral-500">Next →</span>
            <span className="text-neutral-800">
              {next.number}. {next.title}
            </span>
          </Link>
        )}
      </div>
    </nav>
  );
}

export default PrevNext;
