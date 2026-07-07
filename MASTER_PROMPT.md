# MASTER PROMPT — 6.100A ASE Prep Site ("ase-prep")

Paste everything below this line into Claude Code (Opus 4.8) as your first message, from inside an empty project directory that already contains CLAUDE.md and AGENTS.md.

---

## Mission

Build a localhost web app that gets me (an incoming MIT freshman) ready to pass the **6.100A Advanced Standing Exam**. The app must let me:

1. **Code the OCW problem sets in the browser** with a real editor, run button, and automated test cases.
2. **Study topic summaries** for every topic on the ASE, written like a strong TA's review notes.
3. **Track my progress** toward ASE readiness.

The content source of truth is **MIT OCW 6.100L Fall 2022** (same material as 6.100A, taught by Ana Bell):
`https://ocw.mit.edu/courses/6-100l-introduction-to-cs-and-programming-using-python-fall-2022/`

Key OCW pages:
- Materials by lecture: `/pages/material-by-lecture/`
- Problem sets: `/lists/problem-sets/`
- Finger exercises: `/pages/finger-exercises/`
- Lecture notes: `/lists/lecture-notes/`

Content is CC BY-NC-SA. This is a personal, non-commercial study tool. Attribute OCW in the site footer and in each summary page.

## How to think about this project (read carefully, this is your reasoning protocol)

You are Opus 4.8 running as the lead engineer. Before writing any code:

1. **Plan first, code second.** Produce a written plan (PLAN.md) covering: file tree, data model for topics/psets/tests, page routes, and the Pyodide execution design. Do not start implementing until the plan is complete and internally consistent.
2. **Work backwards from the exam.** Every feature must answer: "does this make Donny more likely to pass the ASE?" If a feature doesn't, cut it. No auth, no database, no deployment config, no dark-mode toggle bikeshedding. Localhost only.
3. **Decompose, then parallelize.** Split work into the agent roles defined in AGENTS.md and run independent tracks concurrently (content extraction vs. app shell vs. Python runner). Integration happens only after each track passes its own checks.
4. **Verify, don't assume.** When you fetch OCW pages, confirm the actual pset filenames and lecture titles rather than guessing. When you write test cases for psets, run them against a known-correct reference solution you write yourself first. A test suite that can't be passed is worse than no tests.
5. **State your uncertainty.** If an OCW download link is dead or a pset's grading spec is ambiguous, say so explicitly in a `CONTENT_GAPS.md` file and implement your best reconstruction. Never silently fabricate an OCW problem.
6. **Checkpoint discipline.** After each milestone (defined below), stop, run the app, verify the milestone's acceptance criteria yourself (curl the route, run the tests), and only then continue. If a check fails, fix it before moving on — do not stack broken layers.
7. **Keep the code readable.** I will read this code. Prefer boring, explicit TypeScript over clever abstractions. Small components. Comments only where the "why" isn't obvious.

## Tech stack (fixed — do not substitute)

- **Next.js 14 (App Router) + TypeScript + Tailwind CSS**
- **Monaco Editor** (`@monaco-editor/react`) for the code editor
- **Pyodide** (loaded from CDN in a Web Worker) to execute Python 3 fully client-side — no Python backend, no API routes for code execution
- **localStorage** for progress + saved code (persist per-problem drafts)
- Content stored as **MDX or JSON in `/content`** — no database

Rationale you should respect: zero-backend means `npm run dev` is the entire setup, and a Web Worker keeps infinite loops in student code from freezing the UI (use a worker timeout + terminate/restart pattern, ~10s cap).

## Curriculum: the 26 topics (from OCW 6.100L, materials-by-lecture)

Group these into the site's units. Each topic gets a summary page; each summary maps to its lecture notes/video on OCW.

**Unit 1 — Python basics:** (1) Introduction: variables, types, expressions; (2) Strings, input/output, branching; (3) Iteration (while/for); (4) Loops over strings, guess-and-check, binary representation; (5) Floats and approximation methods; (6) Bisection search.
**Unit 2 — Functions & structures:** (7) Decomposition, abstraction, functions; (8) Functions as objects; (9) Lambda, tuples, lists; (10) Lists and mutability; (11) Aliasing and cloning; (12) List comprehensions, testing, debugging; (13) Exceptions and assertions; (14) Dictionaries.
**Unit 3 — Recursion & OOP:** (15) Recursion; (16) Recursion on non-numerics; (17) Python classes; (18) More class methods (dunder methods, getters/setters); (19) Inheritance; (20) OOP worked example (fitness tracker).
**Unit 4 — Efficiency:** (21) Timing programs, counting operations; (22) Big-O and Θ; (23) Complexity class examples; (24) Sorting algorithms; (25) Plotting (matplotlib basics); (26) List access, hashing, simulations.

## Summary page spec (this is where quality matters most)

Each topic summary must follow this exact structure, in my preferred learning order:

1. **Intuition** — 2-4 sentences, plain English, what problem does this concept solve.
2. **The mechanics** — syntax/setup with a minimal runnable example.
3. **Worked example** — one nontrivial example stepped through line by line.
4. **Traps** — the specific mistakes students make on this topic (e.g., aliasing vs. cloning, mutating a list while iterating, `==` vs `is`, integer division, off-by-one in bisection, forgetting base cases, mutable default args, O(n) `in` on lists vs O(1) on dicts/sets).
5. **Memorize vs. understand** — a short two-column split: things to just know cold (syntax, method names, complexity of common ops) vs. things to be able to derive (recursion structure, complexity analysis).
6. **ASE check** — 3-5 quick self-test questions with hidden answers (details/summary toggle).

Write these yourself with real depth — do not paste OCW text. Aim for the quality of notes a 6.100A TA would hand out before the exam. Complexity tables (list/dict/set op costs) must be included in Unit 4 summaries.

## Pset workspace spec

For each OCW 6.100L problem set (0 through 5, plus the finger exercises grouped by lecture):

- Fetch the actual pset PDFs/starter code from OCW's problem sets page and store originals in `/content/psets/raw/`. Extract each problem into structured JSON: statement (markdown), starter code, function signature, and test cases.
- The workspace page: problem statement on the left, Monaco editor on the right, Run + Run Tests + Reset buttons, output console below, test results as pass/fail list with expected vs. actual on failure.
- Tests run in Pyodide against the user's code: import their function(s), call with inputs, compare outputs. Support tolerance-based comparison for float problems.
- **Write reference solutions** for every problem in `/content/psets/solutions/` (hidden behind a "reveal solution" button with a confirm step), and use them to validate your own test cases in a Node script (`scripts/validate-tests.mjs` driving Pyodide) before shipping.
- Persist my draft code per-problem in localStorage; Reset restores starter code.

If any OCW pset materials are unavailable, reconstruct faithful equivalents based on the pset descriptions and mark them clearly as reconstructions in CONTENT_GAPS.md.

## ASE-style function bank (original problems, all 26 topics)

Before writing these, search for past 6.100A / 6.0001 final exams and ASE materials (OCW hosts old 6.0001 exams; MIT EECS pages describe the ASE) and mirror the actual question style you find. Store what you learn about the format in `/content/exam-format-notes.md` so the problems are calibrated to the real thing, not to your guess.

Then build an original problem bank in `/content/bank/`:

- **3–5 problems per topic, all 26 topics covered — no gaps.** Each problem is exam-style: a function spec with a docstring (name, params, types, return value, 2–3 doctest-style examples), and I implement it in the workspace against hidden tests. Same Monaco + Pyodide workspace as psets.
- Mix in the other question types real exams use: **code-reading problems** ("what does this print / what does `f([1,[2]])` return") answered as short-answer with exact-match checking, and **complexity questions** ("give the Big-O of this function") for Unit 4 topics.
- Difficulty tags per problem: `warmup`, `exam-level`, `stretch`. At least half must be `exam-level`. Exam-level means: multiple interacting concepts (e.g., recursion + dicts, classes + aliasing), not one-liners.
- Every bank problem gets a reference solution and validated tests, same `validate-tests.mjs` pipeline and same quality gate as psets. Adversarial test inputs required: empty inputs, single elements, aliased arguments, negative numbers, ties.
- These are original problems you author. Do not copy exam questions verbatim; write in the same style.

## Practice exams (generated, timed, auto-graded)

Build a practice exam system at `/exams`:

- **Ship at least 6 full-length practice exams**, assembled from the bank (plus exam-only problems if the bank is thin anywhere). Each exam mirrors the real format per your exam-format-notes: roughly 5–7 coding problems + 3–5 code-reading/complexity questions, sampling all 4 units, weighted toward functions, recursion, OOP, and complexity.
- **Timed mode:** countdown matching the real exam length (use 3 hours unless format research says otherwise; make it configurable). Timer visible, auto-submit at zero. No solution reveal during an exam.
- **Auto-grading:** on submit, run every coding problem against its full test suite in Pyodide, grade code-reading answers by exact/normalized match, and compute a percentage score with per-problem breakdown. Partial credit per problem = fraction of tests passed.
- **Pass check:** define a passing threshold constant (default 70%, clearly marked configurable since MIT doesn't publish the real cutoff) and show a blunt PASS / NOT YET verdict on the results page, plus which topics cost the most points, each linking to its summary page.
- **History:** store every attempt (exam id, date, score, per-topic breakdown) in localStorage. Dashboard shows a score-over-time line and flags when the last 2 attempts both passed — that's the "ready to book the ASE" signal.
- **Retakes with fresh problems:** each exam has at least 2 variants (same blueprint, different problems from the bank) so retaking isn't memorization.

## Progress & ASE readiness

- Dashboard home page: 4 units, 26 topics, each with status (not started / reviewed / confident — user toggles), pset completion computed from test passes.
- An **ASE readiness score**: weighted — 35% best-2 practice exam average, 30% pset test pass rate, 20% bank problems solved (exam-level only), 15% topics marked confident. Show the weakest 3 topics prominently with links.
- All state in localStorage under a single versioned key (`ase-prep:v1`) with export/import as JSON (one button each) so I can back it up.

## UI direction

Clean, dense, keyboard-friendly. Think "study tool," not marketing site. Fixed sidebar with the 4 units expanded, breadcrumb, next/prev topic links. Monospace for all code. No hero sections, no animations beyond trivial transitions, no emoji. Light theme default is fine. Keyboard shortcut: Cmd/Ctrl+Enter runs tests in the workspace.

## Milestones (checkpoint after each)

1. **M1 — Plan:** PLAN.md + content schema types. Acceptance: schema covers topics, problems, tests; I can read the plan and understand the whole app.
2. **M2 — Shell:** Next.js app with sidebar nav, routing for all 26 topic pages and 6 pset pages using placeholder content. Acceptance: `npm run dev` works, every route renders.
3. **M3 — Python runner:** Pyodide worker + Monaco workspace with a hardcoded sample problem. Acceptance: I can write code, run it, see stdout, pass/fail a test, and an infinite loop gets killed at the timeout without freezing the page.
4. **M4 — Content:** All 26 summaries written to spec + all psets extracted with validated tests + ASE-style function bank (3–5 problems × 26 topics, all validated). Acceptance: `scripts/validate-tests.mjs` shows every pset AND bank test passing against reference solutions; a coverage script confirms every topic has ≥3 bank problems; CONTENT_GAPS.md lists anything reconstructed.
5. **M5 — Exams + progress + polish:** 6 practice exams with variants, timer, auto-grading, pass verdict, attempt history; dashboard readiness score; export/import; keyboard shortcuts; OCW attribution footer. Acceptance: take one full exam end to end — timer runs, auto-submit works, score and per-topic breakdown are correct against a hand-checked answer set, and a deliberately failing submission shows NOT YET.

At the end, write a README.md with setup (`npm install && npm run dev`), the file tree, and how to add a new problem.

Begin with M1. Show me PLAN.md before proceeding to M2.
