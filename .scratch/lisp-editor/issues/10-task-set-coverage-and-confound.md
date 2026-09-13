# 10: Task set does not populate the reliability cell and confounds difficulty

**What to address:** The fixed task set in `eval/tasks/` is too small to
populate the bracket-safety reliability cell, and each task's difficulty mixes
"locate the target" with "construct the edit", so arm comparisons on
steps/tokens are not clean.

**Blocked by:** none

**Status:** ready-for-agent (design settled 2026-09-14)

## Settled design

- **Headline claim is effort and expressiveness, not bracket safety.** Primary
  metrics are step/token cost and success@1 (is the shape/atom vocabulary
  expressive enough to reach the expected program?). Bracket mismatch is
  reported as a separate reliability cell over a few deliberately
  bracket-dangerous tasks, rather than as the headline.
- **success@1 is two columns.** Structural equality (candidate and expected parse
  to the same datum sequence) and semantic equivalence (a task-declared probe
  yields the same result for both). A side that does not terminate within the
  step budget is `unknown`, excluded from the semantic denominator.
- **Coverage.** Add a key few tasks for the newly expressible operations —
  structural delete, insert into a nested list, and root bootstrap — and keep the
  existing 15. Do not build a full `operation × shape` matrix, and do not
  generate tasks parametrically yet.
- **Depth.** The harness computes each task's target depth and records it as
  report metadata. Depth is not an experimental factor; the old hand-typed
  `nesting` field was wrong and has been removed.
- **Bracket-danger cell.** Keep `t13`–`t15` and add one or two harder tasks (move
  a subtree across a deep parent; insert a form deep inside nested parens).
  Report it as its own cell. The mock-driver runs in `eval/results/` are smoke
  data and must not be used as evidence.

## Evidence

- In the last real run (model `linda/qwen3.5-35b-a3b`, temperature 0, 8 tasks),
  all arms passed: `parseErrorRate = 0` and `parenMismatchRate = 0`. The tasks
  are small single-edit changes that never make text/`sed` editing meaningfully
  error-prone, so the suite measured effort only. The spec flagged this risk
  (`docs/spec.md`, "The headline metric is effort and expressiveness").
- Current task set is 15 tasks: `atom` 4, `wrap` 3, `build` 5, `copy` 1, `multi`
  2; `locate` is `described` 11 / `explicit` 4. `t13`–`t15` are multi-line
  bracket-stress tasks (commit `476b3f6`), but no real-model run has exercised
  them yet.
- Task difficulty varies along two axes at the same time:
  - **Locate** — resolving a natural-language reference versus an explicitly
    named expression.
  - **Construct** — one atom versus `apply:<n>` plus holes versus `let` plus a
    copied subtree versus coordinated edits.
  - Actual target depth ranges from 3 (`t03`) to 7 (`t08`).
- The `ast-edit` arm pays a construction cost the other arms do not, so the
  construct-heavy group skews its steps/token count relative to the locate-only
  group.
- Coverage is partial against the shape catalogue and user stories: no task
  exercises structural delete, root bootstrap, or invalid-path retry.

## Directions

- Separate the two axes in the fixtures: annotate each task with a locate
  difficulty and a construct kind (`atom` / `wrap` / `build` / `copy` / `multi`)
  so effort can be sliced instead of averaged.
- Consider generating tasks parametrically later, once the two axes are
  validated against hand-written fixtures.
- Exact structural equality remains the primary success criterion; the semantic
  column is additive, so a non-canonical but equivalent answer is no longer
  scored as a failure.
- Invalid-path retry is not expressible as a benchmark task (nothing forces the
  agent to issue an invalid edit) and belongs in unit/regression tests instead.
