# ase-prep — 6.100A ASE study tool

A localhost, zero-backend study app for passing the MIT **6.100A Advanced Standing
Exam**. It gives you three things: TA-style **topic summaries** for all 26 OCW
6.100L lectures, in-browser **coding workspaces** (real editor + a real Python
runtime + automated tests) for the OCW problem sets, finger exercises, and an
original exam-style problem bank, and **timed, auto-graded practice exams** with a
readiness dashboard.

Everything runs client-side: Python executes in **Pyodide inside a Web Worker**,
progress lives in `localStorage`. `npm install && npm run dev` is the entire setup.

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

Optional — make it fully offline (no CDN dependency for Pyodide):

```bash
npm run vendor-pyodide   # copies Pyodide into public/pyodide
# then set PYODIDE_INDEX_URL to '/pyodide/' in lib/pyodide-worker.ts
```

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server — the whole product |
| `npm run build && npm run start` | Production build + serve (sanity check before shipping) |
| `npm run validate-tests` | Run **every** coding problem's reference solution against its own tests in Node-hosted Pyodide. Must be all-green. Add `--file <path>` to scope to one file, or `--group psets\|finger\|bank`. |
| `npm run check-coverage` | Assert every topic has ≥3 bank problems and all slugs are valid |
| `npm run typecheck` / `npm run lint` | `tsc --noEmit` / `next lint` |

The Node validator (`validate-tests`) and the in-browser runner share **one**
Python harness (`lib/py/harness.mjs`), so a solution that passes the validator
grades identically in the app.

## What's inside (content counts)

- **26 topic summaries** (`content/topics/*.mdx`) — six-section TA notes.
- **6 problem sets** (`content/psets/ps0–ps5.json`), **22 finger-exercise sets**
  (`content/finger/`), **106 bank problems** across all 26 topics
  (`content/bank/`), **6 practice exams × 2 variants** (`content/exams/`).
- **119 coding problems / 630 automated tests**, all green through the validator;
  plus code-reading and complexity short-answer problems.

Content is derived from **MIT OpenCourseWare 6.100L Fall 2022** (Dr. Ana Bell),
used under **CC BY-NC-SA**. Summaries are original prose; reconstructions and
study-only parts are logged in `CONTENT_GAPS.md`.

## File tree

```
app/                     Next.js 14 App Router routes
  page.tsx               dashboard (readiness score, topic status grid)
  topics/[slug]/         topic summary (renders content/topics/*.mdx)
  psets/ finger/ bank/   index + [problemId] coding/short-answer workspaces
  exams/[examId]/[variantId]/   timed, auto-graded exam runner
  dev/runner-test/       runner acceptance harness
components/
  workspace/             Monaco + Pyodide run/test UI (Workspace, Editor, …)
  ExamRunner.tsx         timed submit + auto-grade + PASS/NOT YET results
  mdx/                   MDX components (Callout, ASECheck, ComplexityTable)
  Sidebar, ProblemView, ShortAnswer, ReadinessCard, ExamTimer, …
lib/
  types.ts               zod schemas — the source of truth for all content
  curriculum.ts          the 26-topic / 4-unit registry
  content.ts             zod-validated content loaders
  runner.ts              client API over the worker (runCode / runTests, 10s watchdog)
  pyodide-worker.ts      Pyodide in a Web Worker
  py/harness.mjs         the shared Python test harness (worker + validator)
  progress.ts readiness.ts grading.ts
content/
  topics/ psets/ finger/ bank/ exams/    authored content (JSON + MDX)
  psets/raw/             original OCW pset PDFs + extracted starter/data
  ocw-index.json         lecture/pset/finger index with local export paths
  exam-format-notes.md   ASE calibration research
public/psets/            pset data files served into the Pyodide FS
scripts/
  validate-tests.mjs     the content quality gate
  check-coverage.mjs     bank coverage gate
COURSE_INFO/             the local OCW 6.100L Fall 2022 export (primary source)
```

## How to add a new problem

1. **Pick the file.** Bank problems go in `content/bank/<topic-slug>.json` (an
   array). Pset problems go in the pset's `problems` array. All must satisfy the
   `Problem` schema in [`lib/types.ts`](lib/types.ts).

2. **Author it.** A **coding** problem needs `kind: "coding"`, a `statement`
   (markdown), `functionSignature`, `starterCode`, a reference `solution`, and
   `tests`. A test is a **Python expression** plus an **expected Python literal**:

   ```json
   {
     "id": "bank-14-e", "kind": "coding", "topicSlug": "14-dictionaries", "unit": 2,
     "source": "bank", "difficulty": "exam-level",
     "statement": "Implement `invert(d)` mapping each value back to its key.",
     "functionSignature": "def invert(d):",
     "starterCode": "def invert(d):\n    pass\n",
     "solution": "def invert(d):\n    return {v: k for k, v in d.items()}\n",
     "tests": [
       { "name": "basic", "expression": "invert({'a': 1})", "expected": "{1: 'a'}" },
       { "name": "empty", "expression": "invert({})", "expected": "{}", "hidden": true }
     ]
   }
   ```

   Use `compare: "float"` (recurses over lists/tuples/**dicts**) with `tolerance`
   for floats, `compare: "unordered"` for order-insensitive lists, `strictType`
   to require `1 != 1.0`, `stdin` to feed `input()`, `pyPackages`/`dataFiles` for
   libraries/files, and `studyOnly: true` (with empty `tests`) for parts that only
   ship a reference solution. Include **adversarial** cases: empty, single element,
   aliased args, ties, negatives. A **code-reading**/**complexity** problem instead
   uses `kind: "code-reading"|"complexity"` with `prompt`, `answer`, and
   `acceptedAnswers`.

3. **Validate.** A test your correct reference solution fails is a bug in the test:

   ```bash
   node scripts/validate-tests.mjs --file content/bank/14-dictionaries.json
   node scripts/check-coverage.mjs
   ```

   Ship only when both are green, then `npm run build`.

## How to add / edit a topic summary

Write `content/topics/<slug>.mdx`, starting at `## Intuition` (no frontmatter, no
H1 — the registry supplies the title). Follow the six-section structure and voice
of [`content/topics/11-aliasing-cloning.mdx`](content/topics/11-aliasing-cloning.mdx):
Intuition → mechanics → worked example → traps → memorize-vs-understand → ASE
check. Put all code in fenced ```python blocks; avoid raw `<`, `>`, `{`, `}` in
prose; use `<Callout>`, `<ASECheck>`, and markdown tables. Unit 4 summaries carry
the ops-complexity table.

---

Study content © MIT OpenCourseWare, 6.100L Fall 2022, Dr. Ana Bell, CC BY-NC-SA.
This is a personal, non-commercial study tool; OCW content is attributed, never
claimed as original.
