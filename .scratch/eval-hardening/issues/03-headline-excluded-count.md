# 03: Surface the headline summary's excluded-task count

**What to build:** The top summary table no longer reads as a full, all-green
result. It states how many bracket-danger tasks it excludes and points to the
bracket-danger cell that covers them, so a reader cannot mistake the headline for
the whole run.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The headline summary displays the number of bracket-danger tasks excluded
      from it.
- [ ] That number matches the bracket-danger cell's task list.
- [ ] `pnpm run typecheck` and `pnpm test` pass.
