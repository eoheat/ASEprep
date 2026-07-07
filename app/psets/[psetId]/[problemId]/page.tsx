// app/psets/[psetId]/[problemId]/page.tsx — a pset coding workspace.
//
// Resolves the problem from the pset JSON (M4). Until content lands, it mounts
// the real Workspace shell around a placeholder CodingProblem so the layout is
// visible now. Unknown pset id → 404; unknown problem id within a real pset → 404.

import { notFound } from 'next/navigation';

import { PageHeader } from '@/components/PageHeader';
import { NoticeBox } from '@/components/NoticeBox';
import { ProblemView } from '@/components/ProblemView';
import { getPset, PSET_IDS } from '@/lib/content';
import { placeholderCodingProblem } from '@/lib/placeholders';
import ocwIndex from '@/content/ocw-index.json';

export default function PsetProblemPage({
  params,
}: {
  params: { psetId: string; problemId: string };
}) {
  const { psetId, problemId } = params;

  // psetId must be one of the six known ids.
  if (!PSET_IDS.includes(psetId as (typeof PSET_IDS)[number])) notFound();

  const pset = getPset(psetId); // null in M2
  const rawTitle = ocwIndex.psets.find((p) => p.id === psetId)?.title ?? psetId.toUpperCase();

  // With real content, the problem must exist in this pset.
  const problem = pset?.problems.find((p) => p.id === problemId);
  if (pset && !problem) notFound();

  const view = problem ?? placeholderCodingProblem(problemId, `${psetId} · ${problemId}`);

  return (
    <>
      <PageHeader
        trail={[
          { label: 'Problem Sets', href: '/psets' },
          { label: pset?.title ?? rawTitle, href: '/psets' },
          { label: view.title },
        ]}
        title={view.title}
      />
      <div className="space-y-4 px-6 py-6">
        {!problem && (
          <NoticeBox tone="placeholder" title="Placeholder workspace">
            The real statement, starter code, and tests for this problem are authored in M4. The
            editor + Run / Run Tests shell below is live now.
          </NoticeBox>
        )}
        <ProblemView problem={view} />
      </div>
    </>
  );
}
