# 10: Task set does not populate the reliability cell and confounds difficulty

**What to address:** The fixed task set in `eval/tasks/` is too small to
populate the bracket-safety reliability cell, and each task's difficulty mixes
"locate the target" with "construct the edit", so arm comparisons on
steps/tokens are not clean.

**Blocked by:** none

**Status:** parked (needs design) — claim reframed, coverage design still open

## Settled so far (2026-09-14)

- **Headline claim is effort and expressiveness, not bracket safety.** Primary
  metrics are step/token cost and success@1 (is the shape/atom vocabulary
  expressive enough to reach the expected program?). Bracket mismatch is
  reported as a separate reliability cell over a few deliberately
  bracket-dangerous tasks, rather than as the headline.
- **success@1 is two columns.** Structural equality (candidate and expected parse
  to the same datum sequence) and semantic equivalence (a task-declared probe
  yields the same result for both). A side that does not terminate within the
  step budget is `unknown`, excluded from the semantic denominator.
- **New vocabulary is available.** `delete`, `insert`, and root bootstrap (see
  issue 11) let the coverage-gap list below be addressed.

## Still open

- Which operations and shapes the task set must cover: a full `operation × shape`
  matrix, or a key few.
- Whether the computed target depth becomes recorded report metadata (the old
  hand-typed `nesting` field was wrong and has been removed).
- The exact make-up of the bracket-danger cell (proposed: 2–3 tasks — wrap a
  large nested span, move a subtree across a deep parent, insert a form deep
  inside nested parens).

## Evidence

- In the last full run (model `linda/qwen3.5-35b-a3b`, temperature 0), all four arms passed all 8 tasks: `parseErrorRate = 0` and `parenMismatchRate = 0` across 32 runs. The tasks are small single-edit changes that never make text/`sed` editing meaningfully error-prone, so the suite measures effort only, not reliability. The spec already flagged this risk (`docs/spec.md`, "The headline metric is effort and expressiveness").
- Task difficulty varies along two axes at the same time:
  - **Locate** — resolving a natural-language reference (`"innermost x"`, `"base case"`, `"final fallback branch"`) versus an explicitly named expression (`"change (+ a (+ b c)) to (+ c (+ b a))"`).
  - **Construct** — one atom (`t03`, `t05`, `t06`, `t07`) versus `apply:<n>` plus holes (`t01`, `t04`) versus `let` plus a copied subtree (`t02`) versus two coordinated edits (`t08`).
  - Actual target depth ranges from 3 (`t03`) to 7 (`t08`); the old hand-typed `nesting` field did not match any computed depth and has been removed.
- The `ast-edit` arm pays a construction cost that the other arms do not, so tasks in the construct-heavy group skew its steps/token count relative to the locate-only group.
- Coverage is partial against the documented shape catalogue and user stories: no task exercises structural delete, `if`/`lambda`/`define` construction, root bootstrap, or invalid-path retry.

## Open questions / directions

- Add the bracket-danger tasks described above; the goal is to actually produce bracket mismatches in `direct`/`text-edit`.
- Separate the two axes in the fixtures: annotate each task with a locate difficulty and a construct kind (`atom` / `wrap` / `build` / `copy` / `multi`) so effort can be sliced instead of averaged.
- Consider generating tasks parametrically instead of maintaining 8 hand-written fixtures.
- Exact structural equality remains the primary success criterion; the semantic column is additive, so a non-canonical but equivalent answer is no longer scored as a failure.
