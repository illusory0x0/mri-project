# Test-suite improvement directions

Status: proposed
Date: 2026-09-15

## Purpose

The editor and experiment harness are in place, but the test suite is small and
single-sample, so the findings it produces are directional rather than measured.
This document collects candidate directions for making the suite broader, more
realistic, and more trustworthy — while treating **token cost as a first-class
constraint**: several current weaknesses exist precisely because real-model runs
are expensive (ADR 0010, ADR 0012).

Each direction carries a **Token cost** line so budget and benefit can be weighed
together. Nothing here is committed work; pick directions from this menu.

## Diagnosis (evidence)

- **Small corpus.** 57 tasks total across three sets
  (`eval/tasks/{basic,orthogonal,leetcode}`). Basic inputs are ≤112 chars and
  expected programs ≤98 chars; LeetCode 66–1045 chars. No large-program or
  stress fixtures.
- **Default n = 1.** `--repeats` defaults to 1 (`eval/options.ts`); Orthogonal
  cells are n = 2 by construction. `docs/spec/findings.md:48` itself says
  "n = 2 … directional signal, not a measured effect".
- **Weak semantic discrimination in the golden corpus.**
  `test/scorer.corpus.test.ts` uses `task.input` as the "known-wrong" candidate
  for 15 of 21 Basic tasks, so it does not prove the probe distinguishes; Basic
  has only 6 probes, Orthogonal 2.
- **Untested layers.** `eval/report.ts` and `eval/report.client.ts` (~995 lines)
  have no direct tests. Option parsing covers only some flags; the OpenAI driver
  has no successful multi-turn test; scorer cancellation / memory bounds are
  untested.
- **Narrow syntax.** `letrec/and/or/when/unless/begin` are shapes
  (`src/ops.ts`) but classify as `apply` in the outline; no `match`/`for`
  shape, no `struct`/macros/backquote.
- **Cost hotspots.** The driver resends the full message history every step
  (`eval/drivers/openai.ts:106`, quadratic growth), sets no `max_tokens`, and
  re-sends a ~2 KB `lisp_editor` tool description each step; there is no cache,
  so repeats are expensive by construction.

## Directions

Numbering matches the discussion menu for cross-reference.

### A. Syntax and realism

#### (1) Widen `lisp-editor` syntax
- **Now.** Reader covers a Racket subset: atoms, strings (4 escapes), booleans,
  chars, `'x` → `(quote x)`; backquote/unquote rejected. `match`/`for/*` parse
  and copy but have no shape; `letrec`/`and`/`or`/`when`/`unless`/`begin` are
  shapes that outline as `apply` (`src/ops.ts:194-227`).
- **Do.** Add shapes for `match`/`for`/`letrec`-class forms; fix outline kinds to
  match the shape catalogue (see open ticket `single-source-facts/02`); decide
  policy on backquote/unquote; expand string/char escapes.
- **Benefit.** Lets the arms operate on realistic Racket, widening the task pool
  and removing the shape-vs-outline drift.
- **Token cost.** Neutral for the suite; adding shapes grows the tool prompt
  slightly (re-sent every step) — see (15).

#### (9) Task realism and diversity
- **Now.** All 20 LeetCode tasks come from one repo
  (`s-cerevisiae/leetcode-racket` @ `7aed964`); no other project, dialect, or
  style. Actual task inputs use `let`/`for`/`and`/`or`/`cond`/`lambda`; absent:
  `letrec`, `match`, `unless`, `begin`.
- **Do.** Draw from more real Racket projects and a wider construct spread;
  record provenance per task as today.
- **Benefit.** Tests whether structural editing generalizes beyond one corpus.
- **Token cost.** ↑ per-run (bigger/real tasks); mitigate with (16) tiering.

#### (10) A purpose-built benchmark language
- **Now.** Scoring depends on Racket's reader and on loading full `racket`
  (`eval/score.rkt`, ADR 0009). Recorded as a low-priority direction in
  `docs/spec/findings.md:65-72`.
- **Do.** Define a small Lisp-style language with fully specified syntax and
  evaluation so scoring no longer depends on Racket.
- **Benefit.** More stable, self-contained scoring; removes a heavy dependency.
- **Token cost.** ↑ (agents are unfamiliar; teaching it consumes prompt tokens).
  Explicitly low priority.

### B. Scale and stability

#### (2) Larger test scale and program size
- **Now.** Tiny synthetic programs; no stress fixtures.
- **Do.** Add bigger programs and stress cases; scale the corpus count.
- **Benefit.** Surfaces behaviors that only appear at depth/size (the bracket
  cell already caught a real mismatch on the deepest task).
- **Token cost.** ↑↑ per full run; pair with (16) smoke/full tiering and (3).

#### (3) Increase repeats for stability
- **Now.** Default `--repeats 1`; stability is modal agreement only
  (`eval/verdict.ts`, `eval/summary.ts`). ADR 0012 keeps `repeats=1` for cost.
- **Do.** Run N > 1 on selected tasks/arms; record agreement per cell.
- **Benefit.** Turns "stable?" from assumption into data.
- **Token cost.** ↑×N linearly. Only viable on a smoke subset until caching;
  see (15)/(16).

#### (11) Statistical rigor
- **Now.** No variance, CI, or significance testing; stability is mode share.
- **Do.** At minimum report n and confidence intervals per cell; consider
  variance and paired tests for arm comparisons.
- **Benefit.** Prevents over-reading n = 2 cells as effects.
- **Token cost.** Neutral (analysis only); more data (3) costs more.

#### (12) Multi-model / multi-temperature matrix
- **Now.** Committed snapshots are a single model at temperature 1
  (`linda/kimi-k2.7-code-highspeed`); CLI default temperature is 0.
- **Do.** Run a model × temperature matrix (candidates listed in `models.txt`).
- **Benefit.** Tests whether conclusions hold across models; separates model
  effects from editor effects.
- **Token cost.** ↑× models × temperatures — the most expensive direction;
  needs (16).

### C. Coverage and correctness (mostly low token cost)

#### (4) Test the untested layers
- **Now.** Report layer untested; option parsing partial; OpenAI success path
  untested; scorer bounds untested.
- **Do.** Add tests for `report.ts`/`report.client.ts`, all flags
  (`--out/--tasks/--model/--base-url/--api-key/--temperature` and the
  "openai requires creds" error), a successful multi-turn tool loop in the
  OpenAI driver, and scorer cancellation/memory bounds.
- **Benefit.** Catches regressions where there is currently no net.
- **Token cost.** ~0 (mock/unit tests, no API).

#### (5) Strengthen golden-corpus discrimination
- **Now.** 15/21 Basic "known-wrong" candidates are just `task.input`.
- **Do.** Author a genuine near-miss variant per task that must score
  non-equal; add probes so semantic differences are detectable.
- **Benefit.** Proves the scorer/probe actually discriminate.
- **Token cost.** ~0 (Racket scorer only).

#### (6) Parse↔print round-trip property/fuzz tests
- **Now.** Reader tests are inline strings; no round-trip or fuzz coverage.
- **Do.** Generate random ASTs; assert `parse(print(x)) == x` and printer
  idempotence, across the supported subset.
- **Benefit.** A zero-cost regression net that grows automatically as (1)
  widens the syntax.
- **Token cost.** ~0.

#### (7) Raise mock fidelity
- **Now.** `MockDriver.makeDiff` emits a one-line hunk only; tokens are fake
  (`100 + steps*10`). Multi-line diff behavior is only exercised in
  `patch.test.ts` fixtures.
- **Do.** Emit multi-line diffs and a realistic token model from the mock so the
  arm loop is exercised end-to-end without spending API tokens.
- **Benefit.** More of the suite runs for free.
- **Token cost.** ~0 (and reduces reliance on paid runs).

### D. Token-cost governance

#### (15) Lower harness overhead
- **Now.** Full history re-sent each step (`eval/drivers/openai.ts:106`); ~2 KB
  tool description per step; no prompt caching; no `max_tokens`.
- **Do.** Enable provider prompt caching; trim/prune message history; move
  stable tool/schema text to a cacheable prefix; consider `max_tokens` caps.
- **Benefit.** Directly reduces the dominant cost, shrinking the biggest
  blocker to (2)/(3)/(12).
- **Token cost.** ↓ (this *is* the cost reducer).

#### (16) Tiered experiment design
- **Now.** One run covers all sets; there is no cheap "smoke" tier.
- **Do.** Define a small smoke subset for frequent/cheap runs and a full run for
  occasional expensive runs; make the tier explicit in snapshots.
- **Benefit.** Enables routine iteration without paying full-matrix cost.
- **Token cost.** ↓ for day-to-day; full tier unchanged.

#### (17) Editor features that cut steps (and tokens)
- **Now.** No atomic wrap; wrapping needs copy-out + rebuild (extra steps).
  `replace` handles one node per call.
- **Do.** Add an atomic wrap operation and/or stronger batch-edit support.
- **Benefit.** Fewer round-trips ⇒ fewer resent-history tokens per task.
- **Token cost.** ↓ per run; complements (15).

## Cost/benefit summary

| Direction | API cost | Effort | Unlocks |
|---|---|---|---|
| (4) Untested layers | ~0 | M | regression safety |
| (5) Corpus discrimination | ~0 | M | trustworthy scorer |
| (6) Round-trip fuzz | ~0 | S–M | cheap syntax regression |
| (7) Mock fidelity | ~0 | S | free end-to-end runs |
| (1) Widen syntax | ~0 | M–L | realism, (9) |
| (9) Task realism | ↑ | M | generalization |
| (10) Custom language | ↑ | L | Racket independence |
| (15) Lower overhead | ↓ | M | cheap (2)/(3)/(12) |
| (16) Tiering | ↓ | S | routine iteration |
| (17) Editor step-cutting | ↓ | M | cheaper ast-edit |
| (2) Scale/size | ↑↑ | M–L | stress coverage |
| (3) Repeats | ↑×N | S | stability data |
| (11) Statistics | neutral | M | correct reading |
| (12) Model × temp | ↑↑↑ | M | robustness across models |

## Deliberately deferred

Two cost-focused directions surfaced in discussion were **not** selected for
this doc: (13) cost observability and budget guardrails (prompt/completion split,
total-token budget, hard stop) and (14) content-hash result caching to make
repeats/reruns near-free. They remain the natural companions to (15) if paid
runs become frequent; recorded here so the omission is a choice, not an oversight.

## Comments
