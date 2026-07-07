// app/finger/page.tsx — finger-exercise index, grouped by lecture.
//
// OCW has finger exercises for 22 lectures (coverageLectures in ocw-index.json);
// they are reconstructed as runnable problems in M4. This index shows every
// covered lecture with its topic title and OCW solution-PDF link, listing the
// authored problems when they exist and a "reconstructed in M4" note until then.

import Link from 'next/link';

import { PageHeader } from '@/components/PageHeader';
import { NoticeBox } from '@/components/NoticeBox';
import { listFinger } from '@/lib/content';
import { TOPICS } from '@/lib/curriculum';
import ocwIndex from '@/content/ocw-index.json';

/** Build the OCW solution-PDF URL for a lecture from the pattern in the index. */
function solutionUrl(lecture: number): string {
  const pattern = ocwIndex.fingerExercises.solutionUrlPattern;
  return pattern.replace('{NN}', String(lecture).padStart(2, '0'));
}

export default function FingerIndexPage() {
  const lectures = ocwIndex.fingerExercises.coverageLectures;
  const problems = listFinger(); // [] in M2

  return (
    <>
      <PageHeader
        trail={[{ label: 'Finger Exercises' }]}
        title="Finger Exercises"
        description="Short per-lecture drills. OCW publishes prompts + one solution PDF per lecture; runnable versions are reconstructed in M4."
      />
      <div className="space-y-3 px-6 py-6">
        {problems.length === 0 && (
          <NoticeBox tone="placeholder">
            Runnable finger exercises are reconstructed in M4 (OCW has no runnable cells). Each
            lecture below links to its official OCW solution PDF.
          </NoticeBox>
        )}
        <ul className="space-y-2">
          {lectures.map((lecture) => {
            const topic = TOPICS.find((t) => t.number === lecture);
            const forLecture = problems.filter((p) => topic && p.topicSlug === topic.slug);
            return (
              <li key={lecture} className="rounded border border-neutral-200 bg-white p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-neutral-900">
                    <span className="mr-2 font-mono text-xs text-neutral-400">L{lecture}</span>
                    {topic ? topic.title : `Lecture ${lecture}`}
                  </span>
                  <a
                    href={solutionUrl(lecture)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-700 underline hover:text-blue-900"
                  >
                    OCW solution (PDF) ↗
                  </a>
                </div>
                {forLecture.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {forLecture.map((p) => (
                      <li key={p.id}>
                        <Link
                          href={`/finger/${p.id}`}
                          className="rounded border border-neutral-300 px-2 py-0.5 text-xs text-neutral-700 hover:bg-neutral-50"
                        >
                          {p.title} →
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
