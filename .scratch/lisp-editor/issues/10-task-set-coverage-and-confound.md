# 10: Task set does not stress bracket-safety and confounds difficulty

**What to address:** The fixed task set in `eval/tasks/` cannot falsify the headline bracket-mismatch hypothesis, and each task's difficulty mixes "locate the target" with "construct the edit", so arm comparisons on steps/tokens are not clean.

**Blocked by:** none

**Status:** parked (needs design)

## Evidence

- In the last full run (model `linda/qwen3.5-35b-a3b`, temperature 0), all three arms passed all 8 tasks: `parseErrorRate = 0` and `parenMismatchRate = 0` across 24 runs. The tasks are small single-edit changes that never make text/`sed` editing meaningfully error-prone, so the suite measures effort only, not reliability. The spec already flagged this risk (`.scratch/lisp-editor/spec.md`, "A caveat about the headline metric").
- Task difficulty varies along two axes at the same time:
  - **Locate** — resolving a natural-language reference (`"innermost x"`, `"base case"`, `"final fallback branch"`) versus an explicitly named expression (`"change (+ a (+ b c)) to (+ c (+ b a))"`).
  - **Construct** — one atom (`t03`, `t05`, `t06`, `t07`) versus `apply:<n>` plus holes (`t01`, `t04`) versus `let` plus a copied subtree (`t02`) versus two coordinated edits (`t08`).
  - Actual target depth ranges from 3 (`t03`) to 7 (`t08`); the old hand-typed `nesting` field did not match any computed depth and has been removed.
- The `editor` arm pays a construction cost that the other arms do not, so tasks in the construct-heavy group skew its steps/token count relative to the locate-only group.
- Coverage is partial against the documented shape catalogue and user stories: no task exercises `hole` deletion, `if`/`lambda`/`define` construction, root bootstrap, or invalid-path retry.

## Open questions / directions

- Add tasks that are easy to state but hard to edit safely as text: wrap a large nested span, move a subtree across a deep parent, insert a form deep inside nested parens. The goal is to actually produce bracket mismatches in `direct`/`sedawk`.
- Separate the two axes in the fixtures: annotate each task with a locate difficulty and a construct kind (`atom` / `wrap` / `construct` / `move` / `multi-edit`) so effort can be sliced instead of averaged.
- Consider generating tasks parametrically instead of maintaining 8 hand-written fixtures.
- Revisit whether exact-AST equality is the right success criterion: it requires a single canonical answer and forces the instruction to do double duty as both a spec and a disambiguation.
