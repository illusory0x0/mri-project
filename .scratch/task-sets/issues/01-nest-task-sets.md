# 01: Nest task sets and tag every task with its set

**What to build:** Task sets become subdirectories of one tasks root, and a
single run covers them all. `just eval` with no `--tasks` loads Basic,
Orthogonal, and LeetCode together, tags each task with its set, and writes every
run to one results directory; passing a set subdirectory narrows the run. The
report and summary load the whole tree, so a task that exists is never
mislabelled as an unknown `atom`.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Task files live under `eval/tasks/basic/`, `eval/tasks/orthogonal/`, and
      `eval/tasks/leetcode/`, unchanged in content.
- [x] Loading the tasks root returns every task from every set, each carrying its
      set name; ids remain unique across sets.
- [x] Loading a set subdirectory returns only that set, still tagged.
- [x] `just eval` defaults to the tasks root and writes one `eval/results/`;
      `--tasks eval/tasks/basic` runs only that set.
- [x] The stale `eval/results-orthogonal/` and `eval/results-leetcode/` are gone.
- [x] The report loads the whole tree and matches runs by id, so no known task
      falls back to the unknown-task placeholder.
- [x] The golden-corpus test targets Basic; the LeetCode test targets the
      LeetCode set; a loader test asserts the three sets and 57 tasks.
- [x] `just typecheck` and `just test` pass.
