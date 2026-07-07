// components/mdx/MdxComponents.tsx — the component map passed to MDXRemote so
// topic MDX bodies (authored in M4) render with the site's typography and can
// use a few custom study-note blocks.
//
// M2 provides sensible base styling for standard markdown elements plus stubs
// for the custom components the curriculum-writer will use (Callout, ASECheck,
// ComplexityTable). M4/M5 can flesh these out; the contract (the names) is set
// here so authored MDX compiles against it.

import type { ReactNode } from 'react';
import type { MDXRemoteProps } from 'next-mdx-remote/rsc';

/** A labeled callout box for tips/warnings inside a summary. */
function Callout({ type = 'note', children }: { type?: 'note' | 'trap' | 'tip'; children: ReactNode }) {
  const tone =
    type === 'trap'
      ? 'border-red-200 bg-red-50 text-red-900'
      : type === 'tip'
        ? 'border-green-200 bg-green-50 text-green-900'
        : 'border-blue-200 bg-blue-50 text-blue-900';
  return (
    <aside className={`my-4 rounded border px-4 py-3 text-sm ${tone}`}>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide">{type}</p>
      {children}
    </aside>
  );
}

/** The "ASE check" self-test block: a question with a hidden answer. */
function ASECheck({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="my-2 rounded border border-neutral-200 bg-white px-4 py-2">
      <summary className="cursor-pointer text-sm font-medium text-neutral-800">{q}</summary>
      <div className="mt-2 text-sm text-neutral-700">{children}</div>
    </details>
  );
}

/** The ops-complexity table required on every Unit 4 summary (M4 fills rows). */
function ComplexityTable({ children }: { children: ReactNode }) {
  return (
    <div className="my-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

export const mdxComponents: MDXRemoteProps['components'] = {
  Callout,
  ASECheck,
  ComplexityTable,
  h1: (props) => <h1 className="mt-6 text-2xl font-semibold tracking-tight" {...props} />,
  h2: (props) => <h2 className="mt-6 border-b border-neutral-200 pb-1 text-lg font-semibold" {...props} />,
  h3: (props) => <h3 className="mt-4 text-base font-semibold" {...props} />,
  p: (props) => <p className="my-3 leading-relaxed text-neutral-800" {...props} />,
  ul: (props) => <ul className="my-3 list-disc space-y-1 pl-6 text-neutral-800" {...props} />,
  ol: (props) => <ol className="my-3 list-decimal space-y-1 pl-6 text-neutral-800" {...props} />,
  li: (props) => <li className="leading-relaxed" {...props} />,
  a: (props) => <a className="text-blue-700 underline hover:text-blue-900" {...props} />,
  code: (props) => (
    <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[0.9em] text-neutral-800" {...props} />
  ),
  pre: (props) => (
    <pre
      className="my-4 overflow-x-auto rounded border border-neutral-200 bg-neutral-50 p-3 font-mono text-sm leading-relaxed"
      {...props}
    />
  ),
  table: (props) => <table className="my-4 w-full border-collapse text-sm" {...props} />,
  th: (props) => <th className="border border-neutral-200 bg-neutral-50 px-2 py-1 text-left font-semibold" {...props} />,
  td: (props) => <td className="border border-neutral-200 px-2 py-1" {...props} />,
};

export default mdxComponents;
