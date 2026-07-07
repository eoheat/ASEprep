# CONTENT_GAPS.md — reconstructions & known gaps

Per CLAUDE.md / MASTER_PROMPT: never silently invent OCW content. Anything not
verbatim from OCW is flagged `reconstructed: true` in its JSON and logged here.
Seeded at M1 from reconnaissance; content agents keep it current as they build.

## OCW availability (verified M1)

- **All 6 pset handouts (PDF) and code zips (ps0–ps5) download cleanly** — no
  dead links, no auth. URL pattern: `.../mit6_100l_f22_psN.pdf` and
  `.../mit6_100l_f22_psN_code.zip`.
- **26 lecture pages** exist with video/transcript/slides/code. Materials index
  is at the **singular** `/pages/material-by-lecture/` (plural 404s).
- **Finger exercises:** HTML prompts + one solution PDF per lecture only —
  **no runnable cells, no `.py` files.**

## Reconstructions (not verbatim OCW)

1. **All 26 topic summaries** — OCW publishes no per-lecture prose summary. These
   are original TA-style synthesis; scope taken from OCW notes, prose is ours.
   Attribute OCW; never claim as OCW text.
2. **All 22 finger-exercise workspaces** — transcribed from OCW HTML prompts;
   reference solutions rebuilt from the solution PDFs; tests authored by us.
   Coverage is lectures **1–20, 22, 23** only. **No finger exercises exist for
   lectures 21, 24, 25, 26** (do not fabricate them). Multi-part: L7(2), L14(2),
   L22(3), L23(3).
3. **Entire ASE model** — the problem bank (3–5 × 26 topics) and all 6 practice
   exams. Real ASE questions are never published; these are original, authored to
   mirror the review-deck style. Format is a reconstruction, not verbatim content.
4. **ps0** — no starter/tester exists and Parts 1–3 are non-code surveys. Only a
   reconstructed 5-line program is testable: `assert a == numpy.log2(13)`.
5. **ps1 reference solutions** — must reproduce exact off-by-one loop semantics
   (monthly return computed on start-of-month balance) to hit published counts
   (A: 97/79/189, B: 92/131). Bisection `steps` and `r` use tolerance.
6. **ps2 / ps4 randomness** — `hangman()`'s `!` help and ps4 `generate_pad` use
   `random`; deterministic tests require seeded/stubbed reference solutions.

## Partial / study-only (auto-grade a subset; rest has ref solution, no autograde)

- **ps2 `hangman()`** — interactive stdin/stdout + randomness; brittle to
  autograde. The three pure helpers ARE auto-graded; the game is study-only.
- **ps4 `decode_story()`** — checkoff-only on OCW (not in student tester);
  study-only here.
- **ps5 image recovery** — 50% of OCW's grade is manual image inspection; needs
  `Pillow` + binary assets (`image_15.png`, `hidden1.bmp`, `hidden2.bmp`) +
  pickled `.obj` fixtures. Auto-grade only `extract_end_bits` + pixel transforms;
  image outputs are study-only.

## Data-file / packaging notes (for the runner)

- **ps3** needs `tests/student_tests/*.txt` bundled; float tolerance on TF/IDF.
- **ps4** `ps4c` does `import ps4b` and reads `words.txt`/`story.txt`/`pads.txt`
  — auxiliary module + data files must be in the Pyodide FS together.
- **ps0** needs `numpy`; **ps5** needs `Pillow`; **lecture 25 / plotting** needs
  `matplotlib` — loaded lazily per-problem via `pyPackages`.

## ASE format gaps

- Pass threshold, exact section breakdown, per-question points, and problem count
  are **unpublished / login-gated** → inferred. See `content/exam-format-notes.md`.

## Retrieval log — content-scraper (2026-07-03)

- **All 6 pset PDFs + code zips staged** under `content/psets/raw/` with official
  OCW names (`mit6_100l_f22_ps{N}.pdf`, `..._ps{N}_code.zip`) and extracted into
  `content/psets/raw/ps{N}/`. All `__MACOSX/`, `.DS_Store`, `._*` junk stripped.
- **Zip nesting varied:** ps0/ps2/ps4/ps5 had a `1_ps{N}/` top folder (flattened);
  ps1 and ps3 were already flat. **ps3's `tests/student_tests/*.txt` subtree was
  preserved** (8 fixtures) — the tester reads those relative paths; do NOT flatten it.
- **ps0 has NO `ps0.py` starter** (confirmed). Its zip is install-guide PDFs plus
  `pkgtest.py` (a package sanity-check script), not a graded starter. Matches the
  existing note that ps0 is non-code surveys + a reconstructed testable snippet.
- **ps5 binary fixtures all present and non-zero:** `hidden1.bmp` (2.0 MB),
  `hidden2.bmp` (716 KB), `image_15.png` (83 KB), `tester_bw_img.obj` (2.0 MB),
  `tester_rgb_img.obj` (716 KB), plus `noto-sans-mono.ttf` (1.4 MB) for text render.
- **`content/ocw-index.json` built** (26 lectures + 6 psets). Lecture titles/slugs
  copied verbatim from `lib/curriculum.ts`; lecture-page URLs verified against the
  OCW `material-by-lecture` index. Notes URL pattern verified on lec 1 and 14:
  `resources/mit6_100l_f22_lec{NN}_pdf/`. Code URL `..._lec{NN}_code_py/` except
  lectures 12/20/25 → `..._code_zip/`.
- **Best-effort / null fields:** `videoUrl` is `null` for all 26 lectures — OCW
  embeds the video on the lecture page and exposes no stable direct/YouTube URL in
  the page markup; `lecturePageUrl` is the reliable pointer. Pset `title`s are the
  plain OCW labels ("Problem Set N") — OCW publishes no descriptive pset subtitles.
- **Finger exercises** confirmed: one solution PDF per lecture, pattern
  `resources/mit6_100l_f22_ex{NN}_sol_pdf/`; coverage lectures 1–20, 22, 23;
  missing 21, 24, 25, 26.

## Phase B authoring — reconstructions & notes (2026-07-04)

Content authored from the local `COURSE_INFO/` export (primary source). Summaries
are original prose (never OCW text); every coding problem passed
`scripts/validate-tests.mjs`. Reconstructions and known limitations:

### Psets
- **ps0** (`reconstructed: true`): OCW ps0 ships no gradeable starter — surveys,
  install PDFs, and `pkgtest.py` only. The `numpy.log2` first-program exercise is
  authored faithful to `pkgtest.py`'s intent (import a package, call a library fn).
- **ps1-c** (bisection): the OCW grader accepts `steps` within ±2 and savings
  within $100. Tests use float-tolerance on steps and $100 on savings instead of
  hard-coding one step count; the reference reproduces the published counts.
- **ps4 `is_heap`**: OCW's `ps4a.py` uses `is_heap(tree, compare_func)` — followed
  as source of truth.
- **ps4 `generate_pad`**: pad = `random.randint(0,109)` per char; seed-dependent
  expected values computed under `random.seed(0)`, which the shared harness applies
  before each test. If harness seeding changes, ps4-b plaintext tests must be recomputed.
- **ps4 `decode_story`**: `studyOnly` (checkoff-only in OCW; no crisp assertion).
- **ps5 `reveal_bw_image` / `reveal_color_image`**: `studyOnly`. OCW grades against
  pickled staff fixtures + by eye; reconstructed reference uses LSB extraction scaled
  for visibility (BW: `LSB*255`; color: 3 LSBs `*32`). Content is correct regardless
  of display scale factor.
- **ps5 `extract_end_bits`**: OCW `ps5.py` docstring has a bit-count typo; statement
  + solution follow the OCW *tester* behavior (`pixel % 2**num_end_bits`).
- **ps5 `img_to_pix` / `filter`**: hidden expected pixel values were computed from
  `public/psets/ps5/image_15.png` via Pillow. If that asset is replaced, recompute
  those literals.

### Finger exercises (all `reconstructed: true`)
- **Lectures 1-6**: OCW versions are print-based code-snippet tasks with predefined
  variables; reconstructed as return-value functions so they run in the
  expression-based harness. Statements disclose this.
- **Lecture 7 Q2** (`two_quadratics`): prints and returns `None` per OCW spec; graded
  via a stdout-capture helper.
- **Lecture 10**: OCW prompt's usage example is a typo; reconstruction follows the
  docstring spec and notes it.

### Bank
- **Topics 21, 24, 25, 26** have no upstream OCW finger exercise (`missingLectures`)
  — their bank problems are fully original exam-style, with no OCW finger prompt to
  cross-check against.
- **Topic 25 (plotting)**: coding problems compute plot DATA (x/y lists, sorted
  curves, means) so they validate headlessly; a true matplotlib-rendering problem
  would need `pyPackages: ["matplotlib"]` + `studyOnly` (can't assert on a figure).
- **bank-unit-1**: poppler/pdftoppm was unavailable in the authoring environment, so
  lec04-06 note PDFs weren't opened; those problems were authored from established
  6.100L Unit-1 scope + the exam-format review-deck style. All bank problems are
  original (`reconstructed: false`).

### Exams — known bank-depth limitations
- **U3 code-reading pool is shallow** (3 problems: `bank-15-c`, `17-c`, `19-c`)
  filling the R3 slot across 12 variants → ~4 reuses each. Within any single exam the
  two variants stay disjoint, but cross-exam R3 questions repeat. Recommend 2-3 more
  U3 code-reading problems (scope / class-mutation traces) for topics 16/18/20.
- **U1 coding pool is shallow** (13 problems for C1/C2 across 12 variants) → U1 coding
  recurs across exams; some warmups fill exam coding slots. Within-exam variants stay
  disjoint. A few more exam-level U1 coding problems would let C1/C2 lean fully
  exam-level.
