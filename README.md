# ase-prep — 6.100A ASE Study Tool

A web-based study app for passing the MIT **6.100A Advanced Standing Exam**. It gives you three things: TA-style **topic summaries** for all 26 OCW 6.100L lectures, in-browser **coding workspaces** with a real editor, a real Python runtime, and automated tests for the OCW problem sets, finger exercises, and an original exam-style problem bank, plus **timed, auto-graded practice exams** with a readiness dashboard.

The application is deployed to the web and runs entirely client-side. Python executes in **Pyodide inside a Web Worker**, and progress is stored in the browser using `localStorage`. No local installation, localhost server, backend, or database is required to use the application.

## Use the app

Open the deployed application in a web browser and begin studying.

The application provides:

* Topic summaries for all 26 course topics.
* Interactive coding workspaces.
* Python execution directly in the browser.
* Automated test grading.
* OCW problem sets.
* Finger exercises.
* Original exam-style practice problems.
* Timed practice exams.
* A readiness dashboard tracking study progress.

Everything required to study is available through the deployed web application.

## Deployment architecture

```text
User's Browser
      │
      ▼
Deployed Web Application
      │
      ├── Topic summaries
      ├── Problem sets
      ├── Finger exercises
      ├── Problem bank
      ├── Practice exams
      └── Readiness dashboard
              │
              ▼
      Browser Web Worker
              │
              ▼
            Pyodide
              │
              ▼
        Python execution
```

Python code runs inside the user's browser through Pyodide. The deployed application does not require a Python backend or remote code-execution server.

Study progress is stored locally in the browser:

```text
Browser localStorage
        │
        ├── Completed problems
        ├── Exam results
        ├── Topic progress
        └── Readiness data
```

## Content

* **26 topic summaries** (`content/topics/*.mdx`) — six-section TA notes.
* **6 problem sets** (`content/psets/ps0–ps5.json`).
* **22 finger-exercise sets** (`content/finger/`).
* **106 bank problems** across all 26 topics (`content/bank/`).
* **6 practice exams × 2 variants** (`content/exams/`).
* **119 coding problems**.
* **630 automated tests**.
* Code-reading and complexity short-answer problems.

Content is derived from **MIT OpenCourseWare 6.100L Fall 2022** (Dr. Ana Bell), used under **CC BY-NC-SA**. Summaries are original prose; reconstructions and study-only parts are logged in `CONTENT_GAPS.md`.

## Repository commands

The application is already deployed for end users. The following commands are for development and content maintenance only:

| Command                  | What it does                                                    |
| ------------------------ | --------------------------------------------------------------- |
| `npm run dev`            | Start a local development environment                           |
| `npm run build`          | Build the production application                                |
| `npm run start`          | Serve the production build locally                              |
| `npm run vendor-pyodide` | Vendor Pyodide into the application for deployment              |
| `npm run validate-tests` | Run every coding problem's reference solution against its tests |
| `npm run check-coverage` | Assert every topic has ≥3 bank problems and all slugs are valid |
| `npm run typecheck`      | Run TypeScript type checking                                    |
| `npm run lint`           | Run lint checks                                                 |

The Node validator (`validate-tests`) and the in-browser runner share **one** Python harness:

```text
lib/py/harness.mjs
```

A solution that passes the validator grades identically to the same solution in the deployed application.

## File tree

```text
app/
  page.tsx
    dashboard
    readiness score
    topic status grid

  topics/[slug]/
    topic summary

  psets/
  finger/
  bank/
    coding and short-answer workspaces

  exams/[examId]/[variantId]/
    timed, auto-graded exam runner

  dev/runner-test/
    runner acceptance harness

components/
  workspace/
    Monaco + Pyodide run/test UI

  ExamRunner.tsx
    timed submit
    auto-grade
    PASS / NOT YET results

  mdx/
    MDX components
    Callout
    ASECheck
    ComplexityTable

  Sidebar
  ProblemView
  ShortAnswer
  ReadinessCard
  ExamTimer
  ...

lib/
  types.ts
    Zod schemas

  curriculum.ts
    26-topic / 4-unit registry

  content.ts
    content loaders

  runner.ts
    client API over the Pyodide worker

  pyodide-worker.ts
    Pyodide Web Worker

  py/harness.mjs
    shared Python test harness

  progress.ts
  readiness.ts
  grading.ts

content/
  topics/
  psets/
  finger/
  bank/
  exams/

  psets/raw/
    original OCW pset PDFs
    extracted starter/data

  ocw-index.json
    lecture/pset/finger index

  exam-format-notes.md
    ASE calibration research

public/
  psets/
    pset data files

  pyodide/
    optional vendored Pyodide runtime

scripts/
  validate-tests.mjs
  check-coverage.mjs

COURSE_INFO/
  local OCW 6.100L Fall 2022 export
```

## How to add a new problem

1. **Pick the file.**

Bank problems go in:

```text
content/bank/<topic-slug>.json
```

Pset problems go in the pset's `problems` array.

All problems must satisfy the `Problem` schema in `lib/types.ts`.

2. **Author it.**

A coding problem needs:

* `kind: "coding"`
* `statement`
* `functionSignature`
* `starterCode`
* a reference `solution`
* `tests`

A test is a Python expression plus an expected Python literal:

```json
{
  "id": "bank-14-e",
  "kind": "coding",
  "topicSlug": "14-dictionaries",
  "unit": 2,
  "source": "bank",
  "difficulty": "exam-level",
  "statement": "Implement `invert(d)` mapping each value back to its key.",
  "functionSignature": "def invert(d):",
  "starterCode": "def invert(d):\n    pass\n",
  "solution": "def invert(d):\n    return {v: k for k, v in d.items()}\n",
  "tests": [
    {
      "name": "basic",
      "expression": "invert({'a': 1})",
      "expected": "{1: 'a'}"
    },
    {
      "name": "empty",
      "expression": "invert({})",
      "expected": "{}",
      "hidden": true
    }
  ]
}
```

Use `compare: "float"` for floating-point comparisons, `tolerance` for float tolerances, `compare: "unordered"` for order-insensitive lists, `strictType` to distinguish values such as `1` and `1.0`, `stdin` for `input()`, `pyPackages` and `dataFiles` for dependencies, and `studyOnly: true` for reference-only material.

Include adversarial cases such as empty inputs, single-element inputs, aliased arguments, ties, and negative values.

Code-reading and complexity problems use:

```text
kind: "code-reading"
```

or:

```text
kind: "complexity"
```

with `prompt`, `answer`, and `acceptedAnswers`.

3. **Validate.**

A test that the correct reference solution fails is a bug in the test:

```bash
node scripts/validate-tests.mjs \
  --file content/bank/14-dictionaries.json
```

Then run:

```bash
node scripts/check-coverage.mjs
```

Ship only when both are green, followed by a production build.

## How to add or edit a topic summary

Write:

```text
content/topics/<slug>.mdx
```

Start at:

```text
## Intuition
```

with no frontmatter and no H1 because the registry supplies the title.

Follow the six-section structure and voice of:

```text
content/topics/11-aliasing-cloning.mdx
```

The structure is:

1. Intuition
2. Mechanics
3. Worked example
4. Traps
5. Memorize vs. understand
6. ASE check

Put all code in fenced Python blocks. Use `<Callout>`, `<ASECheck>`, and `<ComplexityTable>` where appropriate. Unit 4 summaries carry the operations-complexity table.

---

Study content © MIT OpenCourseWare, 6.100L Fall 2022, Dr. Ana Bell, CC BY-NC-SA.

This is a personal, non-commercial study tool; OCW content is attributed, never claimed as original.
