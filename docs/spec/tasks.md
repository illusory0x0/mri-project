# Tasks and task sets

## Task model

A **Task** is one editing problem. It carries:

- `input` — the program the agent starts from.
- `expected` — the program the edit should reach.
- `instruction` — the natural-language edit request.
- `locate` — how the target is named: `explicit` (the expression is spelled out)
  or `described` (a natural-language reference must be resolved).
- exactly one kind axis:
  - `construct` on Basic and Orthogonal tasks: `atom`, `wrap`, `build`, `copy`,
    or `multi`.
  - `operation` on LeetCode tasks: `replace-node`, `insert-node`, `delete-node`,
    `wrap-node`, or `move-subtree`.
- optionally `probe` — an expression evaluated against both the candidate and the
  expected program to decide semantic equivalence.
- optionally `bracketDanger` — the task's runs are reported in a separate
  reliability cell and excluded from the headline.
- optionally `source` — provenance for a corpus-derived task (`{ repo, file,
  commit }`).

The harness computes each task's **target depth** — the depth of the first node
where `input` and `expected` diverge, reported at the containing list's depth when
an insert or delete changes a list's child count. Depth is report metadata, not an
experimental factor.

## Task sets

A task's **Task set** is the directory it lives in. Sets are subdirectories of one
tasks root:

- **Basic** (`eval/tasks/basic/`, 21 tasks) — hand-authored synthetic edits,
  deliberately deeply nested.
- **Orthogonal** (`eval/tasks/orthogonal/`, 16 tasks) — a controlled subset of
  Basic that crosses `locate` and `construct`. Each pair shares
  `input`/`expected`/`probe` and differs only in the instruction, under a rubric
  where `explicit` names the exact target or replacement and `described` refers to
  it by role, so a per-`construct` cost is not confounded by `locate`.
- **LeetCode** (`eval/tasks/leetcode/`, 20 tasks) — mutate-existing tasks derived
  from real Racket solutions (see below).

The loader walks the tasks root one level deep, tags every task with its set, and
keeps ids unique across sets. `just eval` defaults to the tasks root, so one run
covers every set and writes to one `eval/results/`; passing a set subdirectory
(`--tasks eval/tasks/basic`) narrows the run. Task files carry no `set` field — the
directory is the single source of truth. This classification, the all-sets run,
and the repeats are recorded in ADR 0012.

## Synthetic tasks

Basic and Orthogonal tasks are hand-authored and edited by hand; they were
designed to isolate `locate` and `construct` and to exercise nesting depth. They
are not derived from any external source.

## Corpus tasks (LeetCode)

LeetCode tasks are drawn from a **Corpus** of real Racket LeetCode solutions: the
git-ignored clone in `tmp/spore-leetcode-racket/`, which is a fork of
[`s-cerevisiae/leetcode-racket`](https://github.com/s-cerevisiae/leetcode-racket)
(MIT). The corpus is raw material; it is not itself run.

A corpus task is *mutate-existing*: `expected` is the original solution with its
`#lang` line stripped, `input` is the same program with exactly one seeded edit,
the instruction describes that edit, and the probe calls the entry function on a
small terminating input. Source is inlined into the task JSON, so tasks are
self-contained and reproducible without the clone, and each task records the
upstream repository, file, and clone commit in `source`.

**Selection.** From the 95 solution files in the corpus root (the two helper
modules are excluded), judged against the supported subset (see
`editor.md`): 50 were eligible, 4 weak, and 41 excluded (helper-module
dependencies, other `require`s, `struct`/`class`, continuations, vector or hash
literals, macros). Twenty were chosen for input-type diversity and a mix of
operations — 14 `replace-node`, 2 `wrap-node`, 2 `delete-node`, 1 `move-subtree`,
1 `insert-node`:

`lc-43-multiply-strings`, `lc-50-powx-n`, `lc-51-n-queens`,
`lc-55-jump-game`, `lc-62-unique-paths`, `lc-72-edit-distance`, `lc-135-candy`,
`lc-151-reverse-words`, `lc-168-excel-sheet-column-title`, `lc-179-largest-number`,
`lc-198-house-robber-lazy`, `lc-274-h-index`, `lc-458-poor-pigs`,
`lc-525-contiguous-array`, `lc-565-array-nesting`, `lc-645-set-mismatch`,
`lc-781-rabbits-in-forest`, `lc-797-all-paths`, `lc-1035-uncrossed-lines`,
`lc-1833-max-ice-cream`.

**Probe policy.** Every corpus task carries a probe: a literal call to the entry
function on a small, terminating input. Seeds whose probe output differs between
`input` and `expected` are preferred, so the semantic verdict discriminates; a
structurally discriminating but semantically silent seed is kept and noted. The
scorer treats non-termination as `unknown`; no new budget was added.

**Attribution.** The README's Acknowledgements section credits upstream
`s-cerevisiae/leetcode-racket` (MIT) and states that the clone in `tmp/` is a
fork. Each task's `source.commit` records the clone commit actually read.

## User Stories

1. As an experimenter, I want a fixed set of deeply nested edits, so that the
   nesting-depth hypothesis is exercised directly.
2. As an experimenter, I want each task set to be a subdirectory of one tasks
   root, so that the layout itself names the classification.
3. As an experimenter, I want a task to carry its set without duplicating it in
   the task file, so that the directory stays the single source of truth.
4. As an experimenter, I want `just eval` to run every set by default, so that I
   do not have to remember three directory names.
5. As an experimenter, I want to narrow a run to one set, so that a focused run is
   still possible.
6. As an experimenter, I want every set's runs in one results directory, so that
   one report and one summary cover the whole experiment.
7. As an experimenter, I want a second task set authored from real solutions, so
   that the structural-vs-text comparison can be read on programs an agent would
   actually touch.
8. As an experimenter, I want corpus tasks to be mutate-existing, so that
   `expected` is a real program and the edit is one local change.
9. As an experimenter, I want corpus tasks to carry `operation` and `source`, so
   that their edit kind and provenance are explicit.
10. As an experimenter, I want each task's target depth recorded, so that I can
    see what a task exercises.
11. As a tool author, I want one recursive task loader, so that every entrypoint
    agrees on what "all tasks" means.
12. As a tool author, I want the set derived at load time, so that no task file
    can disagree with its directory.
13. As a tool author, I want the stale per-set results directories gone, so that
    there is one place results live.
14. As a tool author, I want existing single-run artifact names unchanged, so that
    scripts and old snapshots keep working.

## Testing Decisions

**What makes a good test here.** Tests assert external behavior only: the loaded
task list (counts, sets, ids) and the scored verdicts of the task fixtures. Tests
never reach into helper internals.

**Seams.** The existing Node seams are reused: the task loader and the scorer.

**Coverage.** A loader test asserts that the tasks root returns every task from
every set, each tagged with its set, with unique ids, and that a set subdirectory
returns only that set. The golden-corpus test targets Basic; the LeetCode test
loads every corpus task and asserts that `expected` scores structurally equal and
(where a probe exists) semantically `equal`, that `input` diverges, and that every
`source` field is present.

**Prior art.** The existing harness unit tests and the golden-corpus tests.

## Out of Scope

- Auto-deriving tasks from the corpus; every task is hand-authored.
- LeetCode's official sample inputs and outputs (not present in the corpus).
- Helper modules `list-node.rkt` / `tree-node.rkt` and the tree / linked-list task
  families that need them.
- Preserving `#lang` or comments.
- Rewriting or migrating the already-committed summary snapshots.
