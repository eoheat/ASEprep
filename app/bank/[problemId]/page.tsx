// app/bank/[problemId]/page.tsx — a bank problem: coding workspace OR short-answer.
//
// getProblem resolves the id across content; ProblemView renders the right
// interactive part based on problem.kind. Until the bank is authored (M4), any
// id falls back to a placeholder coding problem so the workspace shell is visible.

import { PageHeader } from '@/components/PageHeader';
import { NoticeBox } from '@/components/NoticeBox';
import { ProblemView } from '@/components/ProblemView';
import { getProblem, listBank } from '@/lib/content';
import { placeholderCodingProblem } from '@/lib/placeholders';
import { getTopic } from '@/lib/curriculum';

export default function BankProblemPage({ params }: { params: { problemId: string } }) {
  const problem = getProblem(params.problemId);
  const view = problem ?? placeholderCodingProblem(params.problemId, `Bank · ${params.problemId}`);
  const bankAuthored = listBank().length > 0;
  const topic = getTopic(view.topicSlug);

  return (
    <>
      <PageHeader
        trail={[
          { label: 'Problem Bank', href: '/bank' },
          ...(topic ? [{ label: topic.title }] : []),
          { label: view.title },
        ]}
        title={view.title}
      />
      <div className="space-y-4 px-6 py-6">
        {!problem && (
          <NoticeBox tone="placeholder" title="Placeholder workspace">
            {bankAuthored
              ? 'No bank problem with this id was found.'
              : 'The problem bank is authored in M4. The workspace shell below is live now.'}
          </NoticeBox>
        )}
        <ProblemView problem={view} />
      </div>
    </>
  );
}
