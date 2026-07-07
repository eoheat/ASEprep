// app/exams/page.tsx — practice-exam list + attempt history.
//
// Lists authored exams (M5) with their variants; shows attempt history + a
// score-over-time strip from progress. In M2 no exams exist, so the list shows a
// "6 exams assembled in M5" note and the history is empty.

import Link from 'next/link';

import { PageHeader } from '@/components/PageHeader';
import { NoticeBox } from '@/components/NoticeBox';
import { ExamHistory } from '@/components/ExamHistory';
import { listExams } from '@/lib/content';
import { DEFAULT_EXAM_MINUTES } from '@/lib/types';

export default function ExamsIndexPage() {
  const exams = listExams(); // [] in M2

  return (
    <>
      <PageHeader
        trail={[{ label: 'Practice Exams' }]}
        title="Practice Exams"
        description={`Full-length, timed, auto-graded exams (default ${DEFAULT_EXAM_MINUTES} min). Six exams with variants are assembled from the bank in M5.`}
      />
      <div className="space-y-8 px-6 py-6">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Exams</h2>
          {exams.length === 0 ? (
            <NoticeBox tone="placeholder">
              The six practice exams (each ≥2 variants, ~6 coding + 4 short-answer, sampling all four
              units) are assembled in M5 once the problem bank is authored.
            </NoticeBox>
          ) : (
            <ul className="space-y-2">
              {exams.map((exam) => (
                <li key={exam.id} className="rounded border border-neutral-200 bg-white p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-neutral-900">{exam.title}</span>
                    <span className="text-xs text-neutral-500">
                      {exam.timeLimitMinutes} min · pass {Math.round(exam.passThreshold * 100)}% ·{' '}
                      {exam.variants.length} variants
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">{exam.blueprint}</p>
                  <Link
                    href={`/exams/${exam.id}`}
                    className="mt-2 inline-block rounded border border-neutral-300 px-2 py-0.5 text-xs text-neutral-700 hover:bg-neutral-50"
                  >
                    Open →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Attempt history
          </h2>
          <ExamHistory />
        </section>
      </div>
    </>
  );
}
