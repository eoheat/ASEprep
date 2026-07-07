// app/finger/[problemId]/page.tsx — a finger-exercise workspace.
//
// Resolves the problem by id (M4 authors finger problems). Until content lands,
// mounts the real workspace shell around a placeholder CodingProblem so the
// layout is visible. A real-but-unknown id would 404 once content exists; in M2
// there is no content, so we always fall back to a placeholder.

import { PageHeader } from '@/components/PageHeader';
import { NoticeBox } from '@/components/NoticeBox';
import { ProblemView } from '@/components/ProblemView';
import { getProblem, listFinger } from '@/lib/content';
import { placeholderCodingProblem } from '@/lib/placeholders';

export default function FingerProblemPage({ params }: { params: { problemId: string } }) {
  const problem = getProblem(params.problemId);
  const view = problem ?? placeholderCodingProblem(params.problemId, `Finger · ${params.problemId}`);
  const authored = listFinger().length > 0;

  return (
    <>
      <PageHeader
        trail={[{ label: 'Finger Exercises', href: '/finger' }, { label: view.title }]}
        title={view.title}
      />
      <div className="space-y-4 px-6 py-6">
        {!problem && (
          <NoticeBox tone="placeholder" title="Placeholder workspace">
            {authored
              ? 'No finger exercise with this id was found.'
              : 'Runnable finger exercises are reconstructed in M4. The workspace shell below is live now.'}
          </NoticeBox>
        )}
        <ProblemView problem={view} />
      </div>
    </>
  );
}
