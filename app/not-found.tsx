// app/not-found.tsx — the 404 page (rendered by notFound() and unmatched routes).

import Link from 'next/link';

import { PageHeader } from '@/components/PageHeader';

export default function NotFound() {
  return (
    <>
      <PageHeader trail={[{ label: 'Not found' }]} title="Page not found" />
      <div className="px-6 py-6 text-sm text-neutral-700">
        <p>That page does not exist.</p>
        <Link href="/" className="mt-3 inline-block text-blue-700 underline hover:text-blue-900">
          ← Back to the dashboard
        </Link>
      </div>
    </>
  );
}
