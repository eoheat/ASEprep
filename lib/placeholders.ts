// lib/placeholders.ts — synthetic content used only until M4 drops in real
// JSON/MDX. Pure and client-safe (no filesystem). These let every route render
// its real layout in M2: a workspace page shows the actual Workspace shell
// wired around a placeholder CodingProblem, rather than a bare "TODO".

import type { CodingProblem, UnitNumber } from '@/lib/types';
import { TOPICS } from '@/lib/curriculum';

/**
 * Build a minimal, valid CodingProblem so workspace routes can mount the real
 * Workspace shell before authored content exists. `topicSlug`/`unit` are filled
 * from the curriculum when the id encodes a known lecture number, else defaulted
 * to the first topic.
 */
export function placeholderCodingProblem(id: string, title?: string): CodingProblem {
  const { topicSlug, unit } = inferTopic(id);
  return {
    kind: 'coding',
    id,
    title: title ?? `Problem ${id}`,
    topicSlug,
    unit,
    statement:
      'Placeholder problem. The real statement, starter code, tests, and reference solution are authored in milestone M4.',
    difficulty: 'exam-level',
    source: 'bank',
    reconstructed: false,
    functionSignature: 'def solve():',
    starterCode: 'def solve():\n    # Your code here\n    pass\n',
    tests: [{ expression: 'solve()', expected: 'None', compare: 'exact', strictType: false, hidden: false }],
    solution: 'def solve():\n    return None\n',
    pyPackages: [],
    dataFiles: [],
    studyOnly: false,
  };
}

/**
 * Best-effort topic/unit from an id. If the id contains a 1–2 digit number that
 * matches a lecture number (e.g. "bank-14-a" → lecture 14), use that topic;
 * otherwise fall back to the first topic. Purely cosmetic for M2 placeholders.
 */
function inferTopic(id: string): { topicSlug: string; unit: UnitNumber } {
  const numMatch = id.match(/\b(\d{1,2})\b/);
  if (numMatch) {
    const n = Number(numMatch[1]);
    const topic = TOPICS.find((t) => t.number === n);
    if (topic) return { topicSlug: topic.slug, unit: topic.unit };
  }
  return { topicSlug: TOPICS[0].slug, unit: TOPICS[0].unit };
}
