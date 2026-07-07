# exam-format-notes.md — 6.100A ASE calibration

Purpose: calibrate the problem bank and practice exams to the real 6.100A
Advanced Standing Exam, not to a guess. Compiled from primary-source
reconnaissance (M1). Confidence is labeled per claim because MIT does not
publish the ASE in detail (the authoritative page is login-gated).

## Sources fetched

- MIT EECS Advanced Standing Exams — https://www.eecs.mit.edu/academics/undergraduate-programs/curriculum/advanced-standing-exams/
- MIT Registrar ASE policy — https://registrar.mit.edu/classes-grades-evaluations/examinations/advanced-standing-examinations
- 6.100A ASE (login-gated shell) — https://introcomp.mit.edu/6.100A_ase
- MITx 6.0001.ASEr study course — https://lms.mitx.mit.edu/courses/course-v1:MITx+6.0001.ASEr+Exam/about
- Official 6.100A final-review deck (read in full) — https://sicp-s1.mit.edu/_static/fall22/review_session.pdf
- 6.0001 Fall 2016 syllabus (predecessor) — https://ocw.mit.edu/courses/6-0001-introduction-to-computer-science-and-programming-in-python-fall-2016/pages/syllabus/
- 6.100L Fall 2022 syllabus — https://ocw.mit.edu/courses/6-100l-introduction-to-cs-and-programming-using-python-fall-2022/pages/syllabus/
- synicalsyntax/6.0001 (README only; problems need MIT certs) — https://github.com/synicalsyntax/6.0001

## Confirmed (HIGH confidence)

- **Delivery:** online, computer-based, on the MITx platform; **closed-book** —
  only a local Python IDE + the MITx submission window; no notes/internet.
- **Language:** Python 3 (older material references 3.5; Python 2.7 scores 0).
- **Grading:** autograded by **hidden unit tests**; the real exam shows **no live
  score / no test-case results** (unlike sample exams).
- **Length:** **~120 minutes**, within a longer proctored window (reported
  ~6 hours, 10am–4pm Boston — reported-but-not-directly-verified).
- **Scope:** cumulative over all four units — Guttag *Intro to Computation and
  Programming Using Python*, **Chapters 1–10**. Maps to a 6.0001/6.100A final.
- **Retake policy:** **no retake** if failed (may enroll in the course later);
  cannot have previously registered for the subject.

## Question styles (HIGH confidence — from the official review deck)

1. **Write-a-function** (primary/dominant) — implement to a spec, hidden-test graded.
2. **Code-reading / "what does this print"** — trace nested loops, aliasing/
   mutation, scope (deck examples: nested-loop accumulation; `L1..L4` list
   mutation/cloning; scope programs printing 90/5/8).
3. **Complexity / Big-O (Θ)** — tight bound of a loop/recursive function; the
   ops-complexity table.
4. **True/False conceptual** — e.g. `math.sqrt(2.0)*math.sqrt(2.0)==2.0` is False
   (float rounding); dict keys must be immutable (True).
5. Multiple-choice conceptual — INFERRED, lower confidence.

## Topic weighting (INFERRED — MIT publishes no weights)

- Unit 1 (basics, strings, branching, loops, bisection): ~25–30%
- Unit 2 (lists/tuples/dicts/sets, comprehensions, mutability/aliasing,
  functions/scope/lambda, recursion): **~30–35% — heaviest**, deepest traps.
- Unit 3 (testing/exceptions, classes, light inheritance): ~15–20%.
- Unit 4 (Big-O/Θ, growth classes, search/sort costs, slicing cost): ~15–20%,
  also woven through Units 2–3.

## App defaults driven by this

- **Timer default = 120 min** (`DEFAULT_EXAM_MINUTES`). Was assumed 180; recon
  overrides.
- **Pass threshold** is **UNPUBLISHED**. Spec asked for 0.70; recon recommended
  0.60. Shipped default `DEFAULT_PASS_THRESHOLD = 0.70`, clearly configurable in
  Settings. Treat any specific cutoff as a study target, not MIT's real bar.
- The app's Pyodide + hidden-test model already matches the real ASE mechanic
  (write code → submit → hidden tests → no score shown). Add code-tracing and
  Big-O drills to cover the non-coding styles.

## Gaps (log; do not paper over)

- Exact section breakdown, problem count, and per-question points: unpublished /
  login-gated → the "6 coding + 4 short-answer" blueprint is inferred.
- The 6-hour window / 10am–4pm timing come from search snippets, not opened pages.
- OCW does not publish the actual quizzes/finals; the only fetchable style source
  is the review deck. No real past ASE could be enumerated.
- **Action for Donny:** email `6.0001-ase@mit.edu` or log into
  `introcomp.mit.edu/6.100A_ase` for the official Exam Rules + downloadable
  sample exam to confirm structure and threshold.
