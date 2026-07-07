// app/topics/[slug]/page.tsx — a topic summary page.
//
// Metadata (title, unit, blurb, OCW lecture link) always comes from the
// curriculum registry, so the page renders fully in M2 even before the MDX body
// exists. When content/topics/<slug>.mdx is authored (M4), its body is rendered
// here via next-mdx-remote/rsc with no further wiring — a placeholder note shows
// until then.

import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';

import { PageHeader } from '@/components/PageHeader';
import { PrevNext } from '@/components/PrevNext';
import { TopicStatusToggle } from '@/components/TopicStatusToggle';
import { NoticeBox } from '@/components/NoticeBox';
import { mdxComponents } from '@/components/mdx/MdxComponents';
import { getTopicMeta } from '@/lib/content';
import { TOPIC_SLUGS, getUnit, topicPrevNext } from '@/lib/curriculum';
import ocwIndex from '@/content/ocw-index.json';

export function generateStaticParams() {
  return TOPIC_SLUGS.map((slug) => ({ slug }));
}

export const dynamicParams = false;

export function generateMetadata({ params }: { params: { slug: string } }) {
  const topic = getTopicMeta(params.slug);
  if (!topic) return { title: 'Topic not found · ase-prep' };
  return { title: `${topic.meta.number}. ${topic.meta.title} · ase-prep` };
}

/** OCW lecture page URL for this topic, from the ocw-index course map. */
function ocwLectureUrl(lecture: number): string | undefined {
  const rec = ocwIndex.lectures.find((l) => l.number === lecture);
  return rec?.lecturePageUrl ?? rec?.notesUrl ?? undefined;
}

export default function TopicPage({ params }: { params: { slug: string } }) {
  const topic = getTopicMeta(params.slug);
  if (!topic) notFound();

  const { meta, body, hasBody } = topic;
  const unit = getUnit(meta.unit);
  const { prev, next } = topicPrevNext(meta.slug);
  const lectureUrl = ocwLectureUrl(meta.ocw.lecture);

  return (
    <>
      <PageHeader
        trail={[
          { label: 'Topics' },
          { label: unit ? `Unit ${unit.number}` : `Unit ${meta.unit}` },
          { label: `${meta.number}. ${meta.title}` },
        ]}
        title={`${meta.number}. ${meta.title}`}
        description={meta.blurb}
        actions={<TopicStatusToggle slug={meta.slug} />}
      />

      <article className="px-6 py-6">
        <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
          <span className="rounded bg-neutral-100 px-2 py-0.5">
            {unit ? `Unit ${unit.number} · ${unit.title}` : `Unit ${meta.unit}`}
          </span>
          {lectureUrl && (
            <a href={lectureUrl} target="_blank" rel="noreferrer" className="text-blue-700 underline hover:text-blue-900">
              OCW Lecture {meta.ocw.lecture} ↗
            </a>
          )}
        </div>

        <div className="max-w-3xl">
          {hasBody ? (
            // MDX body authored in M4 renders here with the site component map.
            <MDXRemote source={body} components={mdxComponents} />
          ) : (
            <NoticeBox tone="placeholder" title="Summary coming in M4">
              The six-part TA summary (intuition → mechanics → worked example → traps →
              memorize-vs-understand → ASE check) for this topic is authored in milestone M4.
              The lecture link above points at the source material on MIT OCW.
            </NoticeBox>
          )}
        </div>

        <PrevNext prev={prev} next={next} />
      </article>
    </>
  );
}
