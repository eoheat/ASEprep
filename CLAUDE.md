# CLAUDE.md — ase-prep (6.100A ASE study site)

## What this project is

Localhost-only Next.js app for passing the MIT 6.100A Advanced Standing Exam. Two halves: (a) topic summary pages for all 26 OCW 6.100L lectures, (b) in-browser Python workspaces for the OCW psets with automated tests. Single user (Donny), no backend, no deploy target.

Source of truth for content: MIT OCW 6.100L Fall 2022
https://ocw.mit.edu/courses/6-100l-introduction-to-cs-and-programming-using-python-fall-2022/
License: CC BY-NC-SA — attribute OCW in footer and on summary pages. Never claim OCW content as original.

## Stack (fixed)

- Next.js 14 App Router, TypeScript strict mode, Tailwind
- Monaco via @monaco-editor/react
- Pyodide from CDN inside a dedicated Web Worker (`/lib/pyodide-worker.ts`), 10s execution timeout via worker terminate + respawn
- Content: JSON + MDX under `/content`, loaded at build/server time
- State: localStorage only, single versioned key `ase-prep:v1`

Do not add: databases, auth, API routes for code execution, CSS frameworks beyond Tailwind, state libraries (React state + a small context is enough), analytics.

## Commands

- `npm run dev` — dev server (the entire product)
- `npm run build && npm run start` — sanity check before calling a milestone done
- `node scripts/validate-tests.mjs` — runs every pset test against reference solutions in Node-hosted Pyodide; must be all-green before shipping content
- `npm run lint` / `npx tsc --noEmit` — run both before every commit

## Conventions

- Small, boring, explicit components. No clever generics. Comments explain "why," not "what."
- All content typed: `Topic`, `Problem`, `TestCase` types live in `/lib/types.ts`; everything under `/content` must satisfy them (validate with zod at load time).
- Test cases support `expected` exact match and `tolerance` for float comparison. Every problem MUST have a reference solution and its tests validated before it ships.
- User code always runs in the worker, never on the main thread, never via `eval`.
- File naming: kebab-case routes, topic slugs match OCW lecture numbers (`04-loops-strings-binary`).
- Commit at every milestone boundary with message `M<n>: <summary>`.

## Content quality bar

Summaries follow the 6-part structure in MASTER_PROMPT.md (intuition → mechanics → worked example → traps → memorize-vs-understand → ASE check). Write like a sharp TA, not a textbook. Concrete code over prose. Every Unit 4 page includes the ops-complexity table (list index O(1), list `in` O(n), dict/set `in` O(1) avg, sort O(n log n), etc.).

If OCW material can't be fetched, reconstruct it faithfully and log it in CONTENT_GAPS.md. Never silently invent an "OCW problem."

## How to work

- Follow the milestone order in MASTER_PROMPT.md (M1–M5). Verify each milestone's acceptance criteria yourself (run the app, curl routes, run validate-tests) before advancing.
- Use the subagents defined in AGENTS.md and `.claude/agents/`. Run independent tracks in parallel; integrate only after each track's own checks pass.
- When uncertain about a design choice, pick the simpler option and note the alternative in PLAN.md instead of asking.
- If something is broken, fix the root cause; do not layer workarounds.
