// components/Breadcrumb.tsx — the breadcrumb bar shown under the header.
//
// A dumb, explicit component: pages pass the trail they want. The last crumb is
// rendered as the current page (no link). Server component — no interactivity.

import Link from 'next/link';

export type Crumb = { label: string; href?: string };

export function Breadcrumb({ trail }: { trail: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-neutral-500">
      <ol className="flex flex-wrap items-center gap-1">
        {trail.map((crumb, i) => {
          const last = i === trail.length - 1;
          return (
            <li key={`${crumb.label}-${i}`} className="flex items-center gap-1">
              {crumb.href && !last ? (
                <Link href={crumb.href} className="hover:text-neutral-900 hover:underline">
                  {crumb.label}
                </Link>
              ) : (
                <span className={last ? 'text-neutral-700' : undefined} aria-current={last ? 'page' : undefined}>
                  {crumb.label}
                </span>
              )}
              {!last && <span className="text-neutral-300">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumb;
