// app/exams/[examId]/page.tsx — exam start screen / variant picker.
//
// Shows the exam blueprint, its timer/threshold, and a link to start each
// variant. In M2 no exams are authored, so getExam returns null and the page
// renders a placeholder note instead of 404 (the exam id is a valid planned
// exam; its content is assembled in M5).

import Link from 'next/link';

import { PageHeader } from '@/components/PageHeader';
import { NoticeBox } from '@/components/NoticeBox';
import { getExam } from '@/lib/content';

export default function ExamStartPage({ params }: { params: { examId: string } }) {
  const exam = getExam(params.examId); // null in M2

  return (
    <>
      <PageHeader
        trail={[{ label: 'Practice Exams', href: '/exams' }, { label: exam?.title ?? params.examId }]}
        title={exam?.title ?? params.examId}
        description={exam?.blueprint}
      />
      <div className="space-y-4 px-6 py-6">
        {!exam ? (
          <NoticeBox tone="placeholder" title="Exam not assembled yet">
            This practice exam is assembled from the problem bank in M5. Its timed runner,
            auto-grading, and PASS / NOT YET verdict are wired then.
          </NoticeBox>
        ) : (
          <>
            <div className="rounded border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
              <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-neutral-500">Time limit</dt>
                  <dd className="font-mono">{exam.timeLimitMinutes} min</dd>
                </div>
                <div>
                  <dt className="text-xs text-neutral-500">Pass threshold</dt>
                  <dd className="font-mono">{Math.round(exam.passThreshold * 100)}%</dd>
                </div>
                <div>
                  <dt className="text-xs text-neutral-500">Variants</dt>
                  <dd className="font-mono">{exam.variants.length}</dd>
                </div>
              </dl>
            </div>

            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
                Choose a variant
              </h2>
              <ul className="space-y-2">
                {exam.variants.map((variant) => (
                  <li
                    key={variant.id}
                    className="flex items-center justify-between gap-3 rounded border border-neutral-200 bg-white px-4 py-2 text-sm"
                  >
                    <span className="text-neutral-800">
                      {variant.label}
                      <span className="ml-2 text-xs text-neutral-400">
                        {variant.problemIds.length} problems
                      </span>
                    </span>
                    <Link
                      href={`/exams/${exam.id}/${variant.id}`}
                      className="shrink-0 rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                    >
                      Start →
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </>
  );
}
