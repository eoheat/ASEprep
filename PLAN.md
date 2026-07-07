# PLAN.md — ase-prep (6.100A ASE study site)

Lead-engineer plan for the localhost app that gets Donny ready to pass the MIT
6.100A Advanced Standing Exam. This is the M1 deliverable. Nothing in `/app`,
`/components`, or the runner is built until this plan is approved.

The plan is grounded in primary-source reconnaissance of OCW 6.100L Fall 2022
and the 6.100A ASE (see [§2](#2-verified-facts) and `content/exam-format-notes.md`),
not on assumptions. Where OCW content cannot be used verbatim, the app
reconstructs it and logs it in `CONTENT_GAPS.md`.

---

## 1. Product in one paragraph

Zero-backend Next.js app. Left sidebar: 4 units → 26 topics, plus Problem Sets,
Finger Exercises, Problem Bank, Practice Exams, Dashboard. Three things Donny
does: (a) **study** — read TA-style summaries per topic; (b) **code** — solve
OCW psets, finger exercises, and an original exam-style bank in an in-browser
Monaco editor with a real Python runtime (Pyodide in a Web Worker) and automated
tests; (c) **track** — a dashboard readiness score and timed, auto-graded
practice exams that render a blunt PASS / NOT YET. All state in `localStorage`
under `ase-prep:v1`, with JSON export/import. `npm install && npm run dev` is the
entire setup.

Everything is judged against one question: **does it make Donny more likely to
pass the ASE?** No auth, no DB, no deploy config, no theming bikeshed.

---

## 2. Verified facts

Confirmed by fetching primary OCW/MIT pages (full reconnaissance archived; source
URLs in `content/exam-format-notes.md` and `content/ocw-index.json` once seeded).

### 2.1 Problem sets — exactly ps0–ps5 (all downloadable)

| id | Title | Autograde fit | Notes |
|----|-------|---------------|-------|
| ps0 | Introduction & Installation | **Minimal** | Surveys + a 5-line `ps0.py` (`numpy.log2`). Only that one program is testable. Treat as a warm-up, not a real pset. |
| ps1 | Compound Interest (Saving for a House) | **Good** | 3 parts A/B/C, `input()`-driven; answers stored in vars (`months`, `r`, `steps`). Published counts A: 97/79/189, B: 92/131. Test by feeding stdin + reading the result variable. |
| ps2 | Hangman | **Partial** | 3 pure helpers (`has_player_won`, `get_word_progress`, `get_available_letters`) auto-grade cleanly. The interactive `hangman()` game (exact stdout + randomness) is **study-only**, ref solution provided, not auto-graded. Needs `words.txt`. |
| ps3 | Document Distance | **Best fit** | All pure deterministic functions (freq dicts, similarity, TF-IDF). Needs `tests/student_tests/*.txt` bundled; float tolerance on TF/IDF. |
| ps4 | Recursion + Caesar Cipher (OOP) | **Good** | Part A recursion on trees; Parts B/C classes/inheritance (`Message`/`PlaintextMessage`/`EncryptedMessage`). `ps4c` does `import ps4b`; reads `words.txt`/`story.txt`/`pads.txt`. `generate_pad` uses `random` → seed/stub in tests. `decode_story` is checkoff-only. |
| ps5 | Using Libraries (Image Filters & Steganography) | **Partial** | Needs `Pillow` in Pyodide + binary assets + pickled `.obj` fixtures. 50% of official grade is manual image inspection. Auto-grade only `extract_end_bits` + pixel transforms; rest is study-only. |

Asset URL pattern: `.../mit6_100l_f22_psN.pdf` and `.../mit6_100l_f22_psN_code.zip`
(the `/resources/..._pdf/` pages are wrappers, not the files). These reused files
serve **both** 6.100A and 6.100L (ps1 handout says so) → directly ASE-relevant.

### 2.2 Lectures — exactly 26 (OCW-verified titles)

Materials-by-lecture URL is the **singular** `/pages/material-by-lecture/`
(plural 404s). Every lecture has video + transcript + slides PDF + in-class code
(`.py`, except lectures 12/20/25 which are `.zip`). Titles are used verbatim as
topic titles; see [§4](#4-curriculum--26-topics).

### 2.3 Finger exercises — 22 sets (lectures 1–20, 22, 23)

Only HTML text prompts + one solution PDF per lecture on OCW — **no runnable
cells, no `.py` files**. So runnable finger workspaces are **reconstructions**
(prompt transcribed, reference solution rebuilt from the PDF, tests authored).
**No finger exercises for lectures 21, 24, 25, 26.** Multi-part sets: L7 (2),
L14 (2), L22 (3), L23 (3); ~28 individual questions across 22 sets. (Note: this
contradicts the per-lecture template that implied all-but-25; the dedicated
finger-exercises page is authoritative — trust 22 sets.)

### 2.4 6.100A ASE format

- **Confirmed:** online, computer-based, closed-book, Python 3, autograded by
  hidden unit tests, **~120 minutes**, no live score shown, cumulative over all
  four units (Guttag *Intro to Computation & Programming Using Python*, Ch. 1–10),
  no-retake policy. The app's Pyodide + hidden-test model already matches the real
  ASE mechanic.
- **Question styles (from the official 6.100A final-review deck):** write-a-function
  (primary), code-reading / "what does this print" tracing, Big-O/Θ complexity,
  True/False conceptual.
- **Topic weighting (inferred):** U1 ~25–30%, **U2 ~30–35% (heaviest)**, U3 ~15–20%,
  U4 ~15–20%.
- **Unpublished (login-gated):** exact section breakdown, per-question points,
  problem count, and the **pass threshold**. These are inferred and clearly
  marked configurable.

**Plan defaults driven by this:** exam timer default **120 min** (was assumed
180). Pass threshold kept at **0.70** per spec, but recon recommended 0.60 —
both are one-constant knobs (`DEFAULT_PASS_THRESHOLD`), documented in
`exam-format-notes.md`.

---

## 3. Data model

The single source of truth is [`lib/types.ts`](lib/types.ts) — zod schemas with
inferred TS types, so `/content` is validated at load time (CLAUDE.md). Summary:

- **`TestCase`** — a coding test is expressed in *Python*, not JSON: an
  `expression` (produces the actual value against the user's code) and an
  `expected` Python literal; `compare` ∈ `exact | float | unordered`; optional
  `tolerance`, `stdin`, `hidden`. Comparison happens inside Pyodide so Python
  equality semantics are correct (see [§7](#7-pyodide-execution-design)).
- **`Problem`** — discriminated union on `kind`:
  - `CodingProblem` — `functionSignature`, `starterCode`, `tests[]`, `solution`,
    plus `pyPackages[]` (e.g. `numpy`, `Pillow`) and `dataFiles[]` (text/binary
    files or auxiliary modules written into the Pyodide FS, e.g. ps4's `ps4b.py`,
    `story.txt`).
  - `CodeReadingProblem` / `ComplexityProblem` — short-answer: `prompt`, `answer`,
    `acceptedAnswers[]` (normalized variants), optional `explanation`.
  - Shared base: `id`, `title`, `topicSlug`, `unit`, `statement` (markdown),
    `difficulty`, `source` (`pset | finger | bank | exam`), `reconstructed`.
- **`Pset`** — `id`, `number`, `title`, `ocwUrl`, `overview`, `problems[]`.
- **`TopicMeta`** — MDX frontmatter: `slug`, `number` (1–26), `unit`, `title`,
  `blurb`, `ocw` (lecture #, notes/video URLs). The 6-section body lives in MDX.
- **`Unit`** — `number`, `title`, `topicSlugs[]`.
- **`Exam` / `ExamVariant`** — `timeLimitMinutes` (default 120), `passThreshold`
  (default 0.70), `blueprint`, `variants[]` (≥2), each a list of `problemIds`.
- **Runner I/O** — `RunResult` (stdout/stderr/error/timedOut/durationMs),
  `TestOutcome` (name/pass/expectedRepr/actualRepr/error/hidden).
- **`ProgressState`** (localStorage `ase-prep:v1`) — `topicStatus` (slug→status),
  `problems` (id→{draftCode, solved, lastPassed/Total}), `examAttempts[]`.

---

## 4. Curriculum — 26 topics

Slugs are `NN-kebab` matching OCW lecture numbers (CLAUDE.md). Titles are the
OCW-verified titles.

**Unit 1 — Python basics**
| # | slug | title |
|---|------|-------|
| 1 | `01-introduction` | Introduction (variables, types, expressions) |
| 2 | `02-strings-io-branching` | Strings, Input/Output, Branching |
| 3 | `03-iteration` | Iteration |
| 4 | `04-loops-strings-binary` | Loops over Strings, Guess-and-Check, Binary |
| 5 | `05-floats-approximation` | Floats and Approximation Methods |
| 6 | `06-bisection-search` | Bisection Search |

**Unit 2 — Functions & structures**
| # | slug | title |
|---|------|-------|
| 7 | `07-decomposition-functions` | Decomposition, Abstraction, Functions |
| 8 | `08-functions-as-objects` | Functions as Objects |
| 9 | `09-lambda-tuples-lists` | Lambda Functions, Tuples, and Lists |
| 10 | `10-lists-mutability` | Lists, Mutability |
| 11 | `11-aliasing-cloning` | Aliasing, Cloning |
| 12 | `12-comprehensions-testing-debugging` | List Comprehension, Functions as Objects, Testing, Debugging |
| 13 | `13-exceptions-assertions` | Exceptions, Assertions |
| 14 | `14-dictionaries` | Dictionaries |

**Unit 3 — Recursion & OOP**
| # | slug | title |
|---|------|-------|
| 15 | `15-recursion` | Recursion |
| 16 | `16-recursion-non-numerics` | Recursion on Non-Numerics |
| 17 | `17-python-classes` | Python Classes |
| 18 | `18-more-class-methods` | More Python Class Methods |
| 19 | `19-inheritance` | Inheritance |
| 20 | `20-oop-fitness-tracker` | Fitness Tracker OOP Example |

**Unit 4 — Efficiency**
| # | slug | title |
|---|------|-------|
| 21 | `21-timing-counting-operations` | Timing Programs, Counting Operations |
| 22 | `22-big-o-theta` | Big Oh and Theta |
| 23 | `23-complexity-classes` | Complexity Classes Examples |
| 24 | `24-sorting-algorithms` | Sorting Algorithms |
| 25 | `25-plotting` | Plotting |
| 26 | `26-list-access-hashing-simulations` | List Access, Hashing, Simulations, Wrap-Up |

The unit/topic registry lives in `lib/curriculum.ts` (built M2) so nav, routes,
breadcrumbs, and prev/next derive from one array.

---

## 5. File tree

```
ase-prep/
├─ app/                                 # Next.js 14 App Router
│  ├─ layout.tsx                        # sidebar + breadcrumb shell, footer (OCW attribution)
│  ├─ page.tsx                          # Dashboard: readiness score, weakest 3 topics
│  ├─ globals.css
│  ├─ topics/[slug]/page.tsx            # renders topic MDX + status toggle + prev/next
│  ├─ psets/page.tsx                    # pset index (ps0–ps5)
│  ├─ psets/[psetId]/[problemId]/page.tsx   # coding workspace
│  ├─ finger/page.tsx                   # finger-exercise index (by lecture)
│  ├─ finger/[problemId]/page.tsx       # coding workspace
│  ├─ bank/page.tsx                     # bank index (filter by topic/difficulty/kind)
│  ├─ bank/[problemId]/page.tsx         # workspace (coding) or short-answer
│  ├─ exams/page.tsx                    # exam list + attempt history + score-over-time
│  ├─ exams/[examId]/page.tsx           # variant picker / start screen
│  ├─ exams/[examId]/[variantId]/page.tsx      # timed runner (client)
│  └─ settings/page.tsx                 # export/import JSON, threshold/timer knobs
├─ components/
│  ├─ Sidebar.tsx  Breadcrumb.tsx  PrevNext.tsx  Footer.tsx
│  ├─ Workspace.tsx                     # Monaco + Run/RunTests/Reset + Console + TestResults
│  ├─ Editor.tsx  Console.tsx  TestResults.tsx  RevealSolution.tsx
│  ├─ ShortAnswer.tsx                   # code-reading/complexity input + normalized grade
│  ├─ TopicStatusToggle.tsx  ReadinessCard.tsx  ExamTimer.tsx
│  └─ mdx/ (ASECheck.tsx, ComplexityTable.tsx, Callout.tsx, Code.tsx)
├─ lib/
│  ├─ types.ts            # DONE (M1) — zod schemas + inferred types
│  ├─ curriculum.ts       # units + 26-topic registry
│  ├─ content.ts          # zod-validated loaders (topics/psets/finger/bank/exams)
│  ├─ progress.ts         # localStorage load/save, export/import, version migration
│  ├─ readiness.ts        # readiness score computation (§10)
│  ├─ grading.ts          # short-answer normalization; exam scoring/partial credit
│  ├─ runner.ts           # client API over the worker: runCode / runTests
│  └─ pyodide-worker.ts   # the Web Worker (runner-engineer owns)
├─ content/
│  ├─ topics/                 # 26 .mdx (curriculum-writer)
│  ├─ psets/
│  │  ├─ raw/                 # original OCW PDFs + zips (content-scraper)
│  │  ├─ ps0.json … ps5.json  # structured problems (pset-engineer)
│  │  └─ solutions/           # reference .py
│  ├─ finger/                 # 22 sets → JSON problems (reconstructed)
│  ├─ bank/                   # 26 topic files, 3–5 problems each
│  ├─ exams/                  # 6 exams, ≥2 variants each
│  ├─ ocw-index.json          # lecture → notes/video URL map
│  └─ exam-format-notes.md    # ASE calibration (seeded M1 from recon)
├─ public/psets/…             # bundled pset data files served for the Pyodide FS
├─ scripts/
│  ├─ validate-tests.mjs      # Node+Pyodide: every reference solution passes its tests
│  └─ check-coverage.mjs      # all 26 topics present; each has ≥3 bank problems
├─ CLAUDE.md AGENTS.md MASTER_PROMPT.md PLAN.md CONTENT_GAPS.md README.md QA_REPORT.md
└─ package.json tsconfig.json next.config.mjs tailwind.config.ts postcss.config.js
```

---

## 6. Page routes

| Route | Purpose |
|-------|---------|
| `/` | Dashboard: readiness score, unit/topic status grid, weakest-3 topics, "ready to book" signal |
| `/topics/[slug]` | Topic summary (MDX, 6 sections), status toggle, prev/next, OCW link |
| `/psets` | ps0–ps5 index with per-pset completion |
| `/psets/[psetId]/[problemId]` | Coding workspace |
| `/finger` | Finger exercises grouped by lecture (22 sets) |
| `/finger/[problemId]` | Coding workspace |
| `/bank` | Bank index, filterable by topic / difficulty / kind |
| `/bank/[problemId]` | Coding workspace or short-answer |
| `/exams` | Exam list + attempt history + score-over-time |
| `/exams/[examId]` | Variant picker / start (config: timer, threshold) |
| `/exams/[examId]/[variantId]` | Timed runner; auto-submit at 0; results in-page |
| `/settings` | Export/import JSON; timer & threshold knobs |

All content is read at server/build time and zod-validated; workspaces are client
components (Monaco + worker). Problem `id`s are globally unique so a single
`getProblem(id)` resolves psets, finger, bank, and exam problems.

---

## 7. Pyodide execution design

This is the load-bearing subsystem; correctness and non-freezing matter most.

**Topology.** User code never runs on the main thread and never via `eval`.
`lib/pyodide-worker.ts` is a dedicated Web Worker that loads Pyodide from the CDN
once (`loadPyodide({ indexURL: <jsdelivr> })`) and caches it. `lib/runner.ts` is
the only thing the UI imports; it owns the worker, assigns each request an `id`,
and returns a promise resolving to `RunResult` or `TestOutcome[]`.

**Message protocol.** Main → worker: `{ id, kind: 'run' | 'runTests', code,
tests?, pyPackages?, dataFiles? }`. Worker → main: `{ id, ok, payload }`.

**stdout/stderr + stdin.** The worker redirects `sys.stdout`/`sys.stderr` to
buffers via Pyodide's `setStdout`/`setStderr`, and overrides `input()` to pop
from a per-test `stdin` list (so ps1-style console programs are testable by
feeding inputs and then reading the answer variable).

**Packages & data files.** Before running, the worker `loadPackage(pyPackages)`
(e.g. `numpy` for ps0, `Pillow` for ps5) and writes each `dataFile` into the
Pyodide FS (`FS.writeFile`) — text inline, binary fetched from `/public` as bytes.
Auxiliary modules (ps4's `ps4b.py`) are written the same way so `import ps4b`
resolves.

**The 10s timeout — why terminate/respawn.** Pyodide runs Python *synchronously*
inside the worker, so a `while True: pass` blocks the worker's event loop and it
cannot answer a "please stop" message. The only reliable kill is
`worker.terminate()`. So `runner.ts` starts a 10s watchdog per request; on expiry
it terminates the worker, resolves the pending request with `timedOut: true`, and
**immediately spawns and warms a replacement worker in the background**
(re-initializing Pyodide) so the next run does not pay the full load. The main
thread — and the whole UI — never blocks.

**Pyodide source.** The worker's `indexURL` is a single constant
(`PYODIDE_INDEX_URL`). Default is the pinned CDN (v0.26.4, matched to the installed
`pyodide` npm package that `validate-tests.mjs` uses in Node). Because this is a localhost
study tool, `npm run vendor-pyodide` copies the dist into `/public/pyodide` and
flips the constant to a self-hosted path — one command to remove the bad-wifi
failure mode Donny flagged.

**Test harness (runs inside Pyodide).** For each `TestCase`, the worker builds a
Python driver that:
1. execs the user's `code` in a **fresh namespace** (isolation between tests → an
   adversarial test that aliases/mutates an argument can't leak into the next),
2. seeds `random.seed(0)` for determinism (ps2/ps4 randomness),
3. installs the test's `stdin`, then evaluates `expression` → `actual` and the
   `expected` literal → `expected`,
4. compares by `compare` mode:
   - `exact`: `actual == expected` (Python semantics: list≠tuple; note `1 == 1.0`
     passes — set `strictType` to also require `type(actual)==type(expected)`),
   - `float`: recursive tolerance over scalars, lists, tuples, **and dicts**
     (dict keys matched exactly, values recursively) — required by ps3 TF-IDF,
   - `unordered`: `sorted(actual) == sorted(expected)`, **restricted** to lists of
     mutually-comparable scalars (author contract; unhashable/mixed elements must
     use `exact` on a pre-sorted expression, since `sorted()` would raise),
5. returns `{ name, pass, expectedRepr: repr(expected), actualRepr: repr(actual),
   error }`; a per-test `try/except` means one raising test doesn't abort the batch.

Results marshal back as a JSON array → `TestOutcome[]`. Hidden tests grade but
their `expression`/`expected` aren't shown pre-submit.

**Reset semantics.** Reset restores `starterCode` and clears the per-problem
draft in localStorage.

---

## 8. Content plan & provenance

| Content | Count | Source | Provenance |
|---------|-------|--------|------------|
| Topic summaries | 26 | OCW lecture notes for *scope* | **Original prose** (never paste OCW). Attribute OCW. |
| Psets | ps0–ps5 | OCW handouts + starter zips (verbatim) | Statements/starter verbatim; **reference solutions + tests authored & validated**. Non-autogradable parts (ps2 game, ps5 images, ps4 `decode_story`) are study-only. |
| Finger exercises | 22 sets (~28 Q) | OCW HTML prompts + PDF solutions | **Reconstructed** as runnable (no `.py` exists on OCW). |
| Bank | 3–5 × 26 topics (≥78) | none | **Original**, exam-style, difficulty-tagged; ≥½ `exam-level`. |
| Exams | 6, ≥2 variants each | assembled from bank | Blueprint per [§9](#9-practice-exam-blueprint). |

**Reconstruction rule (CLAUDE.md):** anything not verbatim OCW is flagged
`reconstructed: true` and logged in `CONTENT_GAPS.md`. The recon already
identified what must be reconstructed (finger workspaces, all summaries, all
exam/bank problems, ps0's testable program, seeded ps2/ps4 solutions, ps5's
partial rubric) — `CONTENT_GAPS.md` is seeded with this now.

**Quality gate (every coding problem, no exceptions):** a reference solution
exists and `scripts/validate-tests.mjs` runs it in Node-hosted Pyodide against
its own tests — all green before it ships. A test a correct solution fails is a
bug in the test. Adversarial inputs required: empty, single-element, aliased args,
negatives, ties.

---

## 9. Practice exam blueprint

Mirrors the researched ASE: cumulative, weighted to Unit 2, autograded, 120 min
default. Each exam ≈ **6 coding + 4 short-answer (tracing/complexity)**, sampling
all four units:

| Slot | Kind | Unit | Points |
|------|------|------|--------|
| C1 | coding | 1 | 12 |
| C2 | coding | 1 | 10 |
| C3 | coding | 2 | 12 |
| C4 | coding | 2 | 12 |
| C5 | coding | 3 | 12 |
| C6 | coding | 4 | 10 |
| R1 | code-reading (loops/strings tracing) | 1 | 6 |
| R2 | code-reading (aliasing/mutation) | 2 | 8 |
| R3 | code-reading (scope/classes) | 3 | 8 |
| R4 | complexity (Big-O) | 4 | 10 |

≈ **U1 28% / U2 32% / U3 20% / U4 20%** by points — now matching the recon
weighting (U1 25–30, U2 30–35, U3/U4 15–20). Corrected from the first draft, which
underweighted U1 at 12% and risked leaving easy binary/bisection/string points on
the table. **Variants:** each exam has ≥2 variants drawing *different* bank
problems against the same blueprint, so retaking isn't memorization. **Grading:**
coding = fraction of tests passed (partial credit); short-answer = normalized
exact match; total = weighted %. Auto-submit grades the ~6 coding problems
**sequentially, each under the same 10s watchdog**; a draft that times out scores
the tests it passed before the kill (0 if none) and grading continues to the next
problem — one runaway loop never blocks the batch. Timer visible, auto-submit at
0, no solution reveal during an exam. Result page: PASS / NOT YET vs
`passThreshold`, per-problem breakdown, and per-topic points lost linking to
summaries.

---

## 10. Readiness score & progress

`lib/readiness.ts`, per spec:

```
readiness =
    0.35 * (mean of best-2 practice-exam scores)
  + 0.30 * (pset tests passed / pset tests total)
  + 0.20 * (exam-level bank problems solved / exam-level bank total)
  + 0.15 * (topics marked "confident" / 26)
```

Dashboard shows the score, the weakest 3 topics (lowest contribution) linked to
their summaries, and a **"ready to book the ASE"** flag when the last 2 exam
attempts both passed. `topicStatus` is user-toggled (not-started / reviewed /
confident); pset & bank completion are computed from stored test passes. State is
one versioned `localStorage` key with one-button JSON export and import.

---

## 11. Milestones & agent orchestration

Per AGENTS.md ownership map (disjoint file ownership prevents merge conflicts).

- **M1 (this) — Plan + schema.** ✅ `PLAN.md`, `lib/types.ts`; seeded
  `content/exam-format-notes.md` + `CONTENT_GAPS.md` from recon.
- **M2 — Shell.** `app-builder`: Next.js scaffold, sidebar/routing for all 26
  topics + 6 psets + finger/bank/exam indexes with placeholders. `npm run dev`
  renders every route.
- **M3 — Runner.** `runner-engineer`: `pyodide-worker.ts` + `runner.ts` +
  workspace; hello-world runs, failing test shows expected/actual, `while True:
  pass` killed at 10s without freezing.
- **M4 — Content.** `content-scraper` (fetch raw into `psets/raw/`, build
  `ocw-index.json`), then `curriculum-writer` (26 summaries) ∥ `pset-engineer`
  (psets + finger + bank, all validated). Gate: `validate-tests.mjs` all green;
  `check-coverage.mjs` confirms ≥3 bank/topic; `CONTENT_GAPS.md` current.
- **M5 — Exams + progress + polish.** Lead integrates: 6 exams w/ variants,
  timer, auto-grade, PASS/NOT YET, history; dashboard readiness; export/import;
  Cmd/Ctrl+Enter runs tests; OCW footer. `qa-verifier` sweeps → `QA_REPORT.md`.

Phase A (M2 shell ∥ M3 runner ∥ M4 scrape) launches after this plan is approved —
disjoint files, concurrent. Integration only after each track passes its own
checks. Checkpoint discipline: verify each milestone's acceptance criteria (run
app, curl routes, run validators) before advancing.

---

## 12. Key decisions & open items

- **Exam timer 120 min** (confirmed), not the assumed 180. **Pass threshold 0.70**
  per spec (recon suggested 0.60) — one configurable constant, surfaced in
  Settings and `exam-format-notes.md`.
- **Auto-grade the clean subset; don't fake the rest.** ps2's interactive game,
  ps5's image inspection, ps4's `decode_story` are study-only with reference
  solutions but no auto-grade — matching how OCW actually grades them. Logged in
  `CONTENT_GAPS.md`. (Simpler + honest per CLAUDE.md; alternative — brittle
  stdout/pixel matching — rejected.)
- **Test isolation:** fresh namespace + `random.seed(0)` per test. Cost: re-exec
  per test; benefit: adversarial aliasing/mutation tests are sound. Accepted.
- **Pillow/numpy/matplotlib** load lazily per-problem via `pyPackages`; heavy
  psets (ps5, lecture-25 plotting) opt in.
- **ps0** reduced to the one testable `numpy.log2(13)` program; surveys dropped.
- **Not building:** DB, auth, API routes for code, extra CSS frameworks, state
  libraries, analytics, dark-mode toggle (CLAUDE.md).
- **For authoritative ASE structure**, Donny can email `6.0001-ase@mit.edu` or
  log into `introcomp.mit.edu/6.100A_ase` for the official Exam Rules + sample —
  the numeric internals are login-gated and currently inferred.

---

## 13. Review resolutions (folded into M2/M3 kickoff)

From the M1 checkpoint review. No architecture change; these are edits to
`lib/types.ts`, §7, and §9, routed to the owning track.

**Must-fix (done in the plan; enforced in code by the owning track):**
1. **Dicts in `float` compare** → runner-engineer. `CompareMode` doc + §7 step 4
   now recurse tolerance over dicts (keys exact, values recursive). Unblocks ps3
   TF-IDF (`dict[str, float]`).
2. **`unordered` restriction** → runner-engineer. Documented in `CompareMode` as a
   bank-author contract: lists of mutually-comparable scalars only; unhashable/
   mixed → `exact` on a pre-sorted expression. Not zod-enforced (kept simple).
3. **Exam U1 weighting** → lead/exam assembly. §9 blueprint rebalanced to
   U1 28% / U2 32% / U3 20% / U4 20%, matching recon (was 12% U1).

**Folded in (worth-doing):**
- **Eager worker respawn** (§7): warm a replacement worker on `terminate()` so the
  post-timeout run doesn't eat the full Pyodide load. → runner-engineer.
- **Self-host toggle** (§7): `PYODIDE_INDEX_URL` constant + `npm run vendor-pyodide`
  to serve Pyodide from `/public` (offline-safe). CDN stays the default per fixed
  stack. → runner-engineer.
- **Per-problem exam timeout** (§9): grade coding problems sequentially under the
  watchdog; a timed-out draft scores tests-passed-so-far and grading continues.
  → lead/exam assembly (M5).
- **`strictType` on `TestCase`** (types.ts): opt-in `type(actual)==type(expected)`
  under `exact`, for int-division / `int()` problems. → bank/pset authors (M4).
- **Bank sizing bias** (§8/§11): author **5 problems/topic for U2 & U4**, 3 for U1
  & U3, to feed 6 exams × ≥2 variants × 10 slots without thin reuse. → pset-engineer (M4).
- **Monaco in App Router**: import via `dynamic(() => import(...), { ssr: false })`.
  Hidden tests ship in the client bundle — fine for a personal tool; not treated as
  a security boundary. → app-builder / runner-engineer (M3).
```
