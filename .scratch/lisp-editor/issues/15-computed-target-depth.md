# 15: Record each task's computed target depth

**What to build:** The harness computes each task's target depth from its input
and expected program and records it in the per-run and report data as metadata,
so results can be sliced by depth without a hand-typed field.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Every run records a computed depth.
- [ ] Depth is derived from the task, not entered by hand.
- [ ] The report surfaces depth.
- [ ] No task carries a hand-typed depth or nesting field.
