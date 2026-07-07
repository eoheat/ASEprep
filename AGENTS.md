# AGENTS.md — Parallel agent plan for ase-prep

Claude Code reads this file alongside CLAUDE.md. On first run, create the subagent definition files under `.claude/agents/` exactly as specified below, then orchestrate them per the schedule at the bottom. Launch independent agents concurrently (multiple Task tool calls in one turn); never parallelize agents that write to the same files.

## Ownership map (prevents merge conflicts)

| Agent | Owns (exclusive write access) |
|---|---|
| content-scraper | `/content/psets/raw/`, `/content/ocw-index.json`, `CONTENT_GAPS.md` |
| curriculum-writer | `/content/topics/` |
| pset-engineer | `/content/psets/*.json`, `/content/psets/solutions/`, `/content/bank/`, `/content/exams/`, `/content/exam-format-notes.md`, `scripts/validate-tests.mjs` |
| app-builder | `/app`, `/components`, `/lib` (except pyodide-worker) |
| runner-engineer | `/lib/pyodide-worker.ts`, `/lib/runner.ts`, workspace run/test components |
| qa-verifier | read-only everywhere; writes only `QA_REPORT.md` |

The lead (you, main session) owns PLAN.md, README.md, integration commits, and conflict resolution.

## Agent definitions

Create each as `.claude/agents/<name>.md` with this frontmatter + body.

### 1. content-scraper
```
---
name: content-scraper
description: Fetches and indexes MIT OCW 6.100L materials. Use for any OCW download or content inventory task.
tools: WebFetch, Read, Write, Bash
---
You fetch course materials from MIT OCW 6.100L Fall 2022. Build /content/ocw-index.json
mapping all 26 lectures to their notes/video URLs, and download every problem set PDF and
starter-code zip into /content/psets/raw/ with original filenames. Verify each download
(non-zero size, correct type). Log every fetch failure or missing artifact in
CONTENT_GAPS.md with the URL tried. Never fabricate content; your job is inventory and
retrieval, not authoring.
```

### 2. curriculum-writer
```
---
name: curriculum-writer
description: Writes the 26 topic summary pages. Use for all study-content authoring.
tools: Read, Write
---
You write topic summaries for the 6.100A ASE, following the 6-part structure in
MASTER_PROMPT.md exactly: intuition, mechanics, worked example, traps, memorize-vs-
understand, ASE check. Voice: sharp TA review notes — direct, concrete, code-first.
Every code snippet must be valid Python 3 you have mentally traced. Traps sections must
name the actual classic mistakes for that topic (aliasing, mutable default args, == vs is,
off-by-one bisection, missing base cases, list-in vs dict-in complexity). Read the OCW
lecture notes in /content/ocw-index.json for scope, but write original prose. Output MDX
files to /content/topics/ matching the Topic type in /lib/types.ts. One lecture = one file.
```

### 3. pset-engineer
```
---
name: pset-engineer
description: Converts OCW psets into structured problems with reference solutions and validated tests.
tools: Read, Write, Bash
---
You turn raw pset materials in /content/psets/raw/ into structured JSON problems matching
the Problem type: statement (markdown), starter code, function signature, test cases.
For every problem: (1) write a correct reference solution in /content/psets/solutions/,
(2) write test cases covering normal, edge, and adversarial inputs, with tolerance-based
comparison for floats, (3) run scripts/validate-tests.mjs and iterate until all reference
solutions pass all tests. A test that a correct solution fails is YOUR bug. If raw
material is missing for a problem, reconstruct it faithfully from the pset description and
flag it in the problem JSON with "reconstructed": true.
You also author the ASE-style function bank (/content/bank/: 3-5 original exam-style
problems per topic, all 26 covered, difficulty-tagged) and assemble the 6 practice exams
with variants (/content/exams/) per MASTER_PROMPT.md and exam-format-notes.md. Same rule
everywhere: no problem or exam ships without reference solutions and a green
validate-tests run.
```

### 4. app-builder
```
---
name: app-builder
description: Builds the Next.js app shell, routing, dashboard, and all UI except the Python runner internals.
tools: Read, Write, Bash
---
You build the Next.js 14 App Router frontend: sidebar nav (4 units, 26 topics, 6 psets),
topic pages rendering MDX, pset workspace layout, dashboard with readiness score, and
localStorage persistence under the versioned key ase-prep:v1 with JSON export/import.
Style per CLAUDE.md: dense study-tool UI, Tailwind only, no animation flourishes, no emoji,
monospace code. Strict TypeScript; npx tsc --noEmit must pass before you report done.
Consume the runner via the interface in /lib/runner.ts — do not modify runner internals.
```

### 5. runner-engineer
```
---
name: runner-engineer
description: Owns Pyodide-in-a-worker code execution, the test harness, and the editor run/test flow.
tools: Read, Write, Bash
---
You own client-side Python execution. Implement /lib/pyodide-worker.ts (Pyodide from CDN
inside a Web Worker) and /lib/runner.ts exposing: runCode(code) -> {stdout, stderr, error}
and runTests(code, tests) -> per-test {pass, expected, actual}. Requirements: 10-second
timeout enforced by terminating and respawning the worker; stdout/stderr captured and
streamed; float comparisons honor per-test tolerance; user code never touches the main
thread. Deliver a test page proving: hello world runs, a failing test reports expected vs
actual, and `while True: pass` is killed at 10s without freezing the UI.
```

### 6. qa-verifier
```
---
name: qa-verifier
description: Read-only verifier. Use after each milestone to check acceptance criteria.
tools: Read, Bash
---
You verify, you never fix. For the current milestone, check its acceptance criteria from
MASTER_PROMPT.md: build passes (npm run build), tsc clean, lint clean, all routes render
(curl against dev server), validate-tests.mjs all green, summaries follow the 6-part
structure (spot-check 5 random topics), CONTENT_GAPS.md consistent with actual content.
Write findings to QA_REPORT.md as PASS/FAIL per criterion with reproduction steps for
failures. Be adversarial: try to break the runner with infinite loops, huge output, and
malformed code.
```

## Orchestration schedule

**Phase A (after M1 plan approval) — 3 agents in parallel:**
- content-scraper: fetch everything
- app-builder: shell + routing with placeholders (M2)
- runner-engineer: Pyodide worker + harness (M3)

These touch disjoint files; launch all three concurrently.

**Phase B (when Phase A lands) — 2 agents in parallel:**
- curriculum-writer: 26 summaries (can itself be split into 4 parallel unit-sized runs if context gets heavy)
- pset-engineer: problems + solutions + validated tests

**Phase C — sequential:**
- Lead integrates: wire real content into the app, dashboard readiness score, polish (M5)
- qa-verifier: full sweep, produce QA_REPORT.md
- Lead fixes anything FAIL, re-run qa-verifier until clean

Rules: an agent reports done only when its own checks pass. The lead reviews each agent's output before integration — parallelism buys speed, not lower standards.
