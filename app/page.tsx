// app/page.tsx — Dashboard. Server component that computes the content-side
// readiness totals (how many pset tests / exam-level bank problems exist) and
// hands them to the client ReadinessCard, plus the unit/topic status grid.
//
// In M2 the content directories are empty, so totals are zero and the card shows
// a clean 0% (never NaN); M4/M5 populate content and the number rises.

import { PageHeader } from '@/components/PageHeader';
import { ReadinessCard } from '@/components/ReadinessCard';
import { StatusGrid } from '@/components/StatusGrid';
import { listBank, listPsets, listTopics, isCodingProblem } from '@/lib/content';
import type { ReadinessTotals } from '@/lib/readiness';

function buildTotals(): ReadinessTotals {
  // Count every pset coding test (denominator for the pset pass-rate component).
  let psetTestsTotal = 0;
  for (const pset of listPsets()) {
    for (const problem of pset.problems) {
      if (isCodingProblem(problem)) psetTestsTotal += problem.tests.length;
    }
  }

  // Exam-level bank problems (denominator for the bank component).
  const examLevelBankIds = listBank()
    .filter((p) => p.difficulty === 'exam-level')
    .map((p) => p.id);

  return { psetTestsTotal, examLevelBankIds, topics: listTopics() };
}

export default function DashboardPage() {
  const totals = buildTotals();

  return (
    <>
      <PageHeader
        trail={[{ label: 'Dashboard' }]}
        title="Dashboard"
        description="Your readiness for the 6.100A Advanced Standing Exam, and where to focus next."
      />
      <div className="space-y-8 px-6 py-6">
        <ReadinessCard totals={totals} />

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Topic status
          </h2>
          <StatusGrid />
        </section>
      </div>
    </>
  );
}
