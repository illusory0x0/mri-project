# 02: Record task sets in provenance and group by set

**What to build:** A snapshot states every task set it ran and groups its
aggregates by set, and the report can be filtered to one set. A Basic result is
never averaged into a LeetCode result, and every task card says which set it
belongs to.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Snapshot provenance carries one `{ name, hash }` entry per set present in
      the run, and the snapshot filename still identifies the exact task content
      via a hash of the whole tasks tree.
- [ ] Per-set aggregates include only that set's runs; the per-arm headline is
      split by set.
- [ ] The report offers a task-set filter and shows the set on every task card.
- [ ] A summary test with tasks from two sets asserts separate provenance
      entries and separate per-set aggregates.
- [ ] `just typecheck` and `just test` pass.
