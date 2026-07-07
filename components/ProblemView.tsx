// components/ProblemView.tsx — renders a single Problem's working area: the
// statement on the left, the interactive part on the right. Coding problems get
// the Monaco/Pyodide Workspace (via WorkspacePane); code-reading and complexity
// problems get the ShortAnswer grader. Shared by the pset/finger/bank/exam
// workspace routes so the layout is identical everywhere.
//
// Server component: it only branches on `problem.kind` and mounts the right
// client component. `statement`/`prompt` are shown as pre-wrapped text in M2;
// M4 content is plain markdown-ish text that reads fine as-is.

import { WorkspacePane } from '@/components/WorkspacePane';
import { ShortAnswer } from '@/components/ShortAnswer';
import type { Problem } from '@/lib/types';

export function ProblemView({ problem }: { problem: Problem }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="min-w-0">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          {problem.kind === 'coding' ? 'Problem' : problem.kind === 'complexity' ? 'Complexity' : 'Code reading'}
        </h2>
        <div className="rounded border border-neutral-200 bg-white p-4">
          <StatementText problem={problem} />
        </div>
      </section>

      <section className="min-w-0">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          {problem.kind === 'coding' ? 'Workspace' : 'Answer'}
        </h2>
        {problem.kind === 'coding' ? (
          <WorkspacePane problem={problem} />
        ) : (
          <ShortAnswer problem={problem} />
        )}
      </section>
    </div>
  );
}

function StatementText({ problem }: { problem: Problem }) {
  // Coding problems carry `statement`; short-answer carry `statement` + `prompt`.
  const body = problem.statement;
  const prompt = problem.kind === 'coding' ? undefined : problem.prompt;
  return (
    <div className="space-y-3 text-sm leading-relaxed text-neutral-800">
      <p className="whitespace-pre-wrap">{body}</p>
      {prompt && (
        <pre className="overflow-x-auto rounded border border-neutral-200 bg-neutral-50 p-3 font-mono text-sm">
          {prompt}
        </pre>
      )}
    </div>
  );
}

export default ProblemView;
