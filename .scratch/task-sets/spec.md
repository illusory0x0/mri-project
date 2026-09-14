# task-sets — classify tasks by set, run them all, and measure stability

Status: ready-for-agent

## Problem Statement

The harness treats every task set as a separate top-level directory and a
separate run. `eval/tasks` (Basic, 21 tasks), `eval/tasks-orthogonal`
(Orthogonal, 16), and `eval/tasks-leetcode` (LeetCode, 20) each need their own
`--tasks`, `--out`, report, and summary. The report loads exactly one task
directory, and any run whose task it cannot find is silently relabelled
`construct: "atom"` (`eval/report.ts`), so combining sets or pointing the report
at the wrong directory misclassifies tasks. Comparing sets means juggling three
directories by hand, and there is no way to read run-to-run stability.

## Solution

Make the task set the classification. Sets become subdirectories of one tasks
root — `eval/tasks/basic`, `eval/tasks/orthogonal`, `eval/tasks/leetcode` — and a
task's set is the directory it lives in. A single `just eval` loads every set,
tags each task with its set, and runs them all into one results directory.
The report and summary group by set, and the summary records every set and its
content hash. An opt-in `--repeats N` re-executes each task × arm N times so
stability is measured, not assumed.

## User Stories

1. As an experimenter, I want each task set to be a subdirectory of one tasks
   root, so that the layout itself names the classification.
2. As an experimenter, I want a task to carry its set without duplicating it in
   the task file, so that the directory stays the single source of truth.
3. As an experimenter, I want `just eval` to run every set by default, so that I
   do not have to remember three directory names.
4. As an experimenter, I want to narrow a run to one set by passing its
   subdirectory, so that a focused run is still possible.
5. As an experimenter, I want every set's runs in one results directory, so that
   one report and one summary cover the whole experiment.
6. As an experimenter, I want the report to filter by set, so that I can read
   Basic, Orthogonal, and LeetCode side by side or one at a time.
7. As an experimenter, I want every task card to show its set, so that a mixed
   matrix is never ambiguous.
8. As an experimenter, I want the summary to record every set and its hash, so
   that a snapshot states exactly what was run.
9. As an experimenter, I want the headline and aggregates split by set, so that
   a LeetCode result is not averaged into a Basic result.
10. As an experimenter, I want to repeat each task × arm N times, so that I can
    see whether a verdict is stable or a single-sample artifact.
11. As an experimenter, I want repeated runs to be separate, labelled artifacts,
    so that no repeat overwrites another.
12. As an experimenter, I want the report to show agreement across repeats, so
    that instability is visible at a glance.
13. As an experimenter, I want repeats to be off by default, so that ordinary
    runs keep their current cost.
14. As an experimenter, I want the scorer and task content untouched by this
    change, so that old and new results stay comparable.
15. As a tool author, I want one recursive task loader, so that every entrypoint
    agrees on what "all tasks" means.
16. As a tool author, I want the set derived at load time, so that no task file
    can disagree with its directory.
17. As a tool author, I want a set hash for the whole tasks tree, so that the
    snapshot filename still identifies the exact task content.
18. As a tool author, I want the old per-set results directories gone, so that
    there is one place results live.
19. As a tool author, I want existing single-run artifact names unchanged, so
    that scripts and old snapshots keep working.
20. As a tool author, I want the restructure recorded in an ADR, so that the
    layout and the all-sets/repeats methodology are not accidentally "cleaned
    up" later.

## Implementation Decisions

- **Layout.** Task sets are subdirectories of `eval/tasks/`: `basic`,
  `orthogonal`, `leetcode`. Existing files move into them unchanged.
- **Set identity.** The loader derives a task's set from the subdirectory under
  the tasks root and exposes it on the loaded task. Task files gain no `set`
  field; the directory is the single source of truth.
- **Recursive load.** The task loader walks the tasks root one level deep,
  loading every `*.json` and tagging it with its set. Passing a set
  subdirectory directly loads just that set (its tasks keep that set name).
- **One run, one results directory.** `just eval` defaults to the tasks root, so
  a default run covers every set and writes to one `eval/results/`. `--tasks
  eval/tasks/<set>` narrows the run. The stale git-ignored
  `eval/results-orthogonal/` and `eval/results-leetcode/` are removed.
- **Repeats.** A new `--repeats N` option (default `1`) re-executes each
  task × arm N times. Each execution is a distinct run carrying its repeat
  index; artifacts are `arm-task.json` when `N = 1` and `arm-task-r<N>.json`
  otherwise, so single-run names are unchanged.
- **Provenance.** The snapshot's `taskSet` / `taskSetHash` become a list of
  `{ name, hash }` entries, one per set present in the run, plus a combined hash
  of the whole tasks tree used for the snapshot filename. Old committed
  snapshots are history and are not rewritten.
- **Report.** The report loads the whole tasks tree and matches runs by task id,
  so no run is ever relabelled. It gains a task-set filter and shows the set on
  each task card. The headline and per-construct / per-operation aggregates are
  split by set.
- **Stability.** When repeats are present, report cells show agreement as
  `n/N` and a per-(set, arm) stability table summarizes agreement. With
  `repeats = 1` the display is unchanged.
- **ADR.** Record the layout, all-sets run, and repeats in one ADR.

## Testing Decisions

- **What a good test is here.** Tests assert external behavior only: the loaded
  task list (counts, sets, ids), the snapshot's provenance and grouping, and the
  run/report entrypoints' observable output. Tests never reach into helper
  internals.
- **Seams.** Reuse the existing Node seams: the task loader, the snapshot
  builder, and the eval/report entrypoints. No new seam is introduced.
- **Loader behavior.** Loading the tasks root returns every task from every set,
  each tagged with its set; loading one set subdirectory returns only that set,
  still tagged; ids stay unique across sets.
- **Repeats.** A run with `--repeats N` produces N artifacts per task × arm with
  distinct repeat indices; `N = 1` produces the current filenames.
- **Grouping.** The snapshot records one provenance entry per set with a hash,
  and its per-set aggregates only include that set's runs; a corpus task never
  appears under a basic aggregate.
- **Prior art.** The existing harness unit tests and the golden-corpus tests;
  update their task-directory references to the new layout.

## Out of Scope

- Changing task content, instructions, seeds, probes, arms, or the scorer.
- Rewriting or migrating the already-committed summary snapshots.
- Statistical significance testing across repeats; agreement is descriptive.
- Auto-selecting a set within a single run (a run is all sets or one set).

## Further Notes

- **Vocabulary.** The set names are canonical: **Basic**, **Orthogonal**,
  **LeetCode**; the task set is the directory, and **Corpus** remains the raw
  solutions, not the tasks.
- **Cost.** Running all sets multiplies a run's cost by roughly the number of
  sets; repeats multiply it again. `repeats = 1` keeps ordinary runs at the
  current cost.
- **Orthogonal** is a controlled subset of Basic crossing `locate` and
  `construct`; as its own set it is still run and reported separately, which is
  what isolates the `locate` effect.
