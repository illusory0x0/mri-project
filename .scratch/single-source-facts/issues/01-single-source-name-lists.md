# 01: Single-source the construct, operation, and arm name lists

**What to build:** The lists of names that are each restated by hand — the
construct kinds, the operation kinds, and the arm order — have one definition
that the rest of the code and the tests read from, so adding or renaming a kind
touches one place instead of three.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The construct kinds each have a single exported list; the snapshot's
      per-construct ordering derives from it rather than repeating it.
- [ ] The operation kinds each have a single exported list, and the summary and
      the task-set tests read from it rather than restating the union.
- [ ] The arm order is derived from the arm-name list, not a second hand-written
      copy.
- [ ] Adding or renaming a kind requires touching only its single definition.
- [ ] `just typecheck` and `just test` pass.
