// app/exams/[examId]/[variantId]/page.tsx — the timed exam runner route.
//
// Server component: loads the exam + variant + its problems, then hands them to
// the client <ExamRunner>, which owns the countdown, auto-submit, sequential
// auto-grading in Pyodide, and the PASS / NOT YET results view.

import { PageHeader } from '@/components/PageHeader';
import { NoticeBox } from '@/components/NoticeBox';
import { ExamRunner } from '@/components/ExamRunner';
import { getExam, getExamProblems } from '@/lib/content';

export default function ExamRunnerPage({
  params,
}: {
  params: { examId: string; variantId: string };
}) {
  const exam = getExam(params.examId);
  const variant = exam?.variants.find((v) => v.id === params.variantId);
  const problems = variant ? getExamProblems(variant.problemIds) : [];

  return (
    <>
      <PageHeader
        trail={[
          { label: 'Practice Exams', href: '/exams' },
          { label: exam?.title ?? params.examId, href: `/exams/${params.examId}` },
          { label: variant?.label ?? params.variantId },
        ]}
        title={exam ? `${exam.title} — ${variant?.label ?? params.variantId}` : params.examId}
      />
      <div className="space-y-6 px-6 py-6">
        {!exam || !variant ? (
          <NoticeBox tone="placeholder" title="Exam not found">
            No exam variant matches this URL. Pick one from the{' '}
            <a href="/exams" className="text-blue-700 underline">
              exams list
            </a>
            .
          </NoticeBox>
        ) : problems.length === 0 ? (
          <NoticeBox tone="placeholder" title="No problems in this variant">
            This variant references no resolvable problems.
          </NoticeBox>
        ) : (
          <ExamRunner
            exam={{
              id: exam.id,
              title: exam.title,
              timeLimitMinutes: exam.timeLimitMinutes,
              passThreshold: exam.passThreshold,
            }}
            variantId={variant.id}
            problems={problems}
          />
        )}
      </div>
    </>
  );
}
