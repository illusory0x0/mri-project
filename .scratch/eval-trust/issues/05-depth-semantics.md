# 05: Pin the target-depth semantics for edits that change a list's child count

**What to build:** A settled, tested definition of a task's target depth when an
edit inserts or deletes a node, so depth metadata is trustworthy rather than an
accident of the comparison walk. This closes the last open item of the
code-review follow-ups ticket.

**Blocked by:** 02 (reuses the task corpus to assert depths)

**Status:** ready-for-agent

- [ ] The target depth of an insert task and a delete task is explicitly
      asserted in a test.
- [ ] The chosen definition is documented: either the containing list's depth
      (today's behavior) or the affected node's depth.
- [ ] If the definition changes, the stored run metadata is recomputed so
      existing artifacts stay consistent.
- [ ] `just typecheck` and `just test` pass.
