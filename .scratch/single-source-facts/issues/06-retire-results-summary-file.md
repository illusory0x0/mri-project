# 06: Retire the transient results summary file

**What to build:** A run no longer writes a transient summary file into the raw
results directory. The durable record stays the committed snapshot, and the
report and snapshot builder stop special-casing a file they only exclude.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Running a task set leaves only per-run artifacts in the results directory.
- [ ] The report and the snapshot builder no longer special-case the removed
      file.
- [ ] `just typecheck` and `just test` pass.
