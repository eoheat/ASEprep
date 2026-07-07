// components/Footer.tsx — OCW attribution footer (CC BY-NC-SA).
//
// Required on every page (CLAUDE.md): credit MIT OCW 6.100L Fall 2022, Dr. Ana
// Bell, link the course, and state the license. Course URL comes from the
// ocw-index.json course record so there is one source of truth.

import ocwIndex from '@/content/ocw-index.json';

export function Footer() {
  const { url, instructor, term, license } = ocwIndex.course;
  return (
    <footer className="mt-auto border-t border-neutral-200 px-6 py-4 text-xs leading-relaxed text-neutral-500">
      <p>
        Study content is derived from{' '}
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-neutral-700 underline hover:text-neutral-900"
        >
          MIT OpenCourseWare 6.100L (Introduction to CS and Programming Using Python), {term}
        </a>
        , taught by Dr. {instructor}. Used under {license}. This is a personal,
        non-commercial study tool; OCW content is attributed, never claimed as original.
      </p>
    </footer>
  );
}

export default Footer;
