# Task sets are directories; a run covers them all; repeats measure stability

Status: accepted
Date: 2026-09-14

**Context.** The harness began with one flat task directory and grew a second and
third set as separate top-level directories (`eval/tasks`,
`eval/tasks-orthogonal`, `eval/tasks-leetcode`). The report could load only one
directory and silently relabelled any task it could not find, so sets could not
be compared in one view, and single-sample runs gave no read on stability.

**Decision.** A task set is a subdirectory of the tasks root
(`eval/tasks/{basic,orthogonal,leetcode}`); a task's set is the directory it
lives in. A default run loads every set and writes one results directory;
passing a set subdirectory narrows it. The report and summary group by set, and
the snapshot records each set with its hash. An opt-in `--repeats N` re-executes
each task × arm N times and reports agreement across repeats.

**Why.** The layout names the classification, one run covers the experiment, and
repeats turn stability from an assumption into data.

**Consequences.** A full run costs roughly three sets' worth, times `N` when
repeating, so `repeats = 1` stays the default. Snapshot provenance changed from a
single `taskSet` to a `taskSets` list; committed snapshots from before this
change keep their old shape as history and are not rewritten.

**Related.** ADR 0008 (run with `just`), ADR 0010 (compact summaries).
