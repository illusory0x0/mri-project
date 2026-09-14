# 03: Author the corpus task set

**What to build:** `eval/tasks-leetcode/` with one mutate-existing **Task** per
selected file (see the spec's selection table), source inlined without `#lang`,
`source` provenance recorded, and a hand-written probe per task. Seeds are
finalised by reading each file; a handful are converted to structural
operations (`wrap-node`/`move-subtree`/`insert-node`/`delete-node`) so the
**Operation** axis has real coverage.

**Blocked by:** 01, 02

**Status:** done

- [x] `eval/tasks-leetcode/` holds ~20 task JSON files, one per selected file.
- [x] Extend **Task** with an optional `operation`
      (`replace-node`/`insert-node`/`delete-node`/`wrap-node`/`move-subtree`) and
      an optional `source` (`{repo, file, commit}`); `construct` becomes
      optional. The loader accepts both shapes.
- [x] Every task's `expected` is the unmodified solution (minus `#lang`); every
      `input` differs from it by exactly one seeded edit.
- [x] Every task carries a probe that calls the entry function on a small
      terminating input; seeds whose probe output changes are preferred, and any
      structurally-only seed is annotated.
- [x] The operation mix is recorded and includes at least one task for each of
      `wrap-node`, `move-subtree`, `insert-node`, and `delete-node`.
- [x] A load test asserts each `expected` scores structurally equal and, where a
      probe exists, semantically `equal`; each `input` diverges; every `source`
      field is present.
- [x] `just typecheck` and `just test` pass.
