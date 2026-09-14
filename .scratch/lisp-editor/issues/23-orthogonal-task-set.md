# 23: Separate the locate and construct axes (orthogonal task set)

**What to build:** A task subset on which `locate` and `construct` are fully
crossed, so a per-`construct` cost/expressiveness result is not confounded by
`locate`. Run it, put the cell means in a committed snapshot, and write the
conclusion.

**Blocked by:** none

**Status:** ready-for-human

## Evidence

The 21-task set confounds the two axes. Cell counts before this change:

| construct | explicit | described |
| --------- | -------- | --------- |
| atom      | 0        | 4         |
| wrap      | 0        | 4         |
| build     | 2        | 6         |
| copy      | 1        | 0         |
| multi     | 4        | 0         |

`multi` is 100% explicit and `atom`/`wrap` are 100% described, so any
per-`construct` reading of cost or success could be a `locate` effect.
`docs/spec.md` already flags this ("Tasks still mix reference-resolution
difficulty with construction difficulty, which confounds the effort
comparison").

The existing labels are also inconsistent: `t01` is labelled `described` but
spells out the exact replacement, while `t11` is labelled `explicit` but only
describes the result semantically.

## Decisions

- **Rubric.** `explicit` = the instruction names the exact target expression or
  the literal replacement. `described` = the instruction refers to the target by
  role or behavior, and the target must be resolved.
- **Twins, not new programs.** Each pair shares `input`/`expected`/`probe` and
  differs only in `instruction`, so the program is controlled and only `locate`
  varies.
- **Scope.** Four constructs (`atom`, `wrap`, `build`, `multi`) × both locates ×
  2 tasks = 16 tasks in `eval/tasks-orthogonal/`. `copy` (n=1) is excluded.
  `bracketDanger` is never set.
- **Old set frozen.** `eval/tasks/` is untouched; snapshots over it stay
  comparable.
- **Primary metric.** `tokens` (research cost); `steps` (conversation rounds) is
  secondary.

## Tasks

- [x] Define the `explicit`/`described` rubric.
- [x] Create the 16 twin tasks in `eval/tasks-orthogonal/`.
- [x] Add `--tasks <dir>` to the run harness.
- [x] Add an `(arm, construct, locate)` cell breakdown to the snapshot.
- [ ] Run the orthogonal set and commit the snapshot.
- [ ] Write the conclusion (does the `construct` effect survive conditioning on
      `locate`; is there an interaction) into `docs/spec.md`.
