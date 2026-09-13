# 17: Bracket-danger reliability cell

**What to build:** A set of deliberately bracket-dangerous tasks, reported as
its own cell, so that the text and diff arms have a genuine chance to produce a
bracket mismatch. Retain the existing multi-line tasks and add size- or
nesting-driven ones.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The cell retains the existing multi-line tasks and adds at least one more.
- [ ] The cell's parse-error and bracket-mismatch rates are reported separately
      from the headline metrics.
- [ ] Optionally, a subtree-move task is added once `delete` and `insert` exist.
