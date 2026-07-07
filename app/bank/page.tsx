// app/bank/page.tsx — the problem-bank index, filterable by topic/difficulty/kind.
//
// Loads the full bank server-side, projects each problem to the small shape the
// client filter needs, and hands it to <BankBrowser>. Empty in M2 (bank authored
// in M4) — the browser renders an empty-state note.

import { PageHeader } from '@/components/PageHeader';
import { BankBrowser, type BankListItem } from '@/components/BankBrowser';
import { listBank } from '@/lib/content';

export default function BankIndexPage() {
  const items: BankListItem[] = listBank().map((p) => ({
    id: p.id,
    title: p.title,
    topicSlug: p.topicSlug,
    unit: p.unit,
    kind: p.kind,
    difficulty: p.difficulty,
  }));

  return (
    <>
      <PageHeader
        trail={[{ label: 'Problem Bank' }]}
        title="Problem Bank"
        description="Original, exam-style problems across all 26 topics — coding, code-reading, and complexity. Authored and validated in M4."
      />
      <div className="px-6 py-6">
        <BankBrowser items={items} />
      </div>
    </>
  );
}
