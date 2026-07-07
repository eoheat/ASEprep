'use client';

// components/Sidebar.tsx — the fixed left navigation.
//
// Four units expanded with all 26 topics, plus the top-level sections
// (Dashboard, Problem Sets, Finger Exercises, Problem Bank, Practice Exams,
// Settings). Everything derives from lib/curriculum so nav can never drift from
// the routes. Active link is highlighted from the current pathname.

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { UNITS, TOPICS } from '@/lib/curriculum';

type NavLink = { href: string; label: string };

const TOP_LINKS: NavLink[] = [
  { href: '/', label: 'Dashboard' },
  { href: '/psets', label: 'Problem Sets' },
  { href: '/finger', label: 'Finger Exercises' },
  { href: '/bank', label: 'Problem Bank' },
  { href: '/exams', label: 'Practice Exams' },
  { href: '/settings', label: 'Settings' },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname() ?? '/';

  return (
    <nav
      aria-label="Primary"
      className="flex h-full flex-col overflow-y-auto border-r border-neutral-200 bg-neutral-50 text-sm"
    >
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-neutral-50 px-4 py-3">
        <Link href="/" className="font-mono text-sm font-semibold tracking-tight text-neutral-900">
          ase-prep
        </Link>
        <p className="mt-0.5 text-xs text-neutral-500">6.100A ASE study tool</p>
      </div>

      <ul className="px-2 py-2">
        {TOP_LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={isActive(pathname, link.href) ? 'page' : undefined}
              className={navItemClass(isActive(pathname, link.href))}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>

      <div className="border-t border-neutral-200 px-2 py-2">
        {UNITS.map((unit) => (
          <div key={unit.number} className="mb-3">
            <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Unit {unit.number} · {unit.title}
            </p>
            <ul>
              {unit.topicSlugs.map((slug) => {
                const topic = TOPICS.find((t) => t.slug === slug);
                if (!topic) return null;
                const href = `/topics/${slug}`;
                return (
                  <li key={slug}>
                    <Link
                      href={href}
                      aria-current={isActive(pathname, href) ? 'page' : undefined}
                      className={navItemClass(isActive(pathname, href))}
                    >
                      <span className="mr-2 inline-block w-6 text-right font-mono text-xs text-neutral-400">
                        {topic.number}
                      </span>
                      <span className="align-middle">{topic.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}

function navItemClass(active: boolean): string {
  const base =
    'block rounded px-2 py-1 leading-snug transition-colors hover:bg-neutral-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';
  return active
    ? `${base} bg-neutral-200 font-medium text-neutral-900`
    : `${base} text-neutral-700`;
}

export default Sidebar;
