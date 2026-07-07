// app/psets/page.tsx — the problem-set index (ps0–ps5).
//
// The list of six psets is known now (from ocw-index.json): titles + OCW handout
// links render immediately. Structured problems (content/psets/<id>.json) are
// authored in M4; when present, each pset expands to its problems linking to the
// workspace. Until then a pset shows its OCW links and a "content in M4" note.

import Link from 'next/link';

import { PageHeader } from '@/components/PageHeader';
import { NoticeBox } from '@/components/NoticeBox';
import { getPset, PSET_IDS } from '@/lib/content';
import ocwIndex from '@/content/ocw-index.json';

export default function PsetsIndexPage() {
  return (
    <>
      <PageHeader
        trail={[{ label: 'Problem Sets' }]}
        title="Problem Sets"
        description="The six OCW 6.100L problem sets (ps0–ps5). Statements and starter code are verbatim OCW; reference solutions and tests are authored and validated (M4)."
      />
      <div className="space-y-4 px-6 py-6">
        {PSET_IDS.map((id) => {
          const raw = ocwIndex.psets.find((p) => p.id === id);
          const pset = getPset(id); // null in M2
          const title = pset?.title ?? raw?.title ?? id.toUpperCase();

          return (
            <section key={id} className="rounded border border-neutral-200 bg-white p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-semibold text-neutral-900">
                  <span className="mr-2 font-mono text-sm text-neutral-400">{id}</span>
                  {title}
                </h2>
                <div className="flex gap-3 text-xs">
                  {raw?.pdfUrl && (
                    <a href={raw.pdfUrl} target="_blank" rel="noreferrer" className="text-blue-700 underline hover:text-blue-900">
                      Handout (PDF) ↗
                    </a>
                  )}
                  {raw?.zipUrl && (
                    <a href={raw.zipUrl} target="_blank" rel="noreferrer" className="text-blue-700 underline hover:text-blue-900">
                      Starter code (ZIP) ↗
                    </a>
                  )}
                </div>
              </div>

              {pset ? (
                <>
                  {pset.overview && <p className="mt-2 text-sm text-neutral-600">{pset.overview}</p>}
                  <ul className="mt-3 divide-y divide-neutral-100 rounded border border-neutral-200">
                    {pset.problems.map((problem) => (
                      <li key={problem.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                        <span className="min-w-0 text-neutral-800">{problem.title}</span>
                        <Link
                          href={`/psets/${id}/${problem.id}`}
                          className="shrink-0 rounded border border-neutral-300 px-2 py-0.5 text-xs text-neutral-700 hover:bg-neutral-50"
                        >
                          Open →
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="mt-3">
                  <NoticeBox tone="placeholder">
                    Structured problems for {id} are authored in M4. Use the OCW links above for the
                    original handout and starter code in the meantime.
                  </NoticeBox>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
