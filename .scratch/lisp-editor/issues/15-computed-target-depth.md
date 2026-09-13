# 15: Record each task's computed target depth

**What to build:** The harness computes each task's target depth from its input
and expected program and records it in the per-run and report data as metadata,
so results can be sliced by depth without a hand-typed field.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Every run records a computed depth.
- [x] Depth is derived from the task, not entered by hand.
- [x] The report surfaces depth.
- [x] No task carries a hand-typed depth or nesting field.
