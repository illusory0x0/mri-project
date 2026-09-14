# 04: Share the run-metric math

**What to build:** The per-run rate math — success, structural, and semantic
rates, and the mean step / token figures — is defined once as pure functions and
used by both the live run summary and the committed snapshot, so the two cannot
disagree. No import cycle is introduced.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The rate math is defined once, and both the live summary and the snapshot
      builder call it.
- [ ] No import cycle is introduced between the runner and the snapshot builder.
- [ ] Snapshot values are unchanged; the existing summary tests pass.
- [ ] `just typecheck` and `just test` pass.
